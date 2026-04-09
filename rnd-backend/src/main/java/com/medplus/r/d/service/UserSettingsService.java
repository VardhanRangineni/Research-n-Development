package com.medplus.r.d.service;

import com.medplus.r.d.dto.UserSettingsRequest;
import com.medplus.r.d.dto.UserSettingsResponse;
import com.medplus.r.d.entity.Role;
import com.medplus.r.d.entity.User;
import com.medplus.r.d.exception.ResourceNotFoundException;
import com.medplus.r.d.repository.RoleRepository;
import com.medplus.r.d.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserSettingsService {

    private static final Set<String> ALLOWED_ROLES = Set.of("HEAD", "MANAGER", "EXECUTIVE");

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserSettingsResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getId))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<String> getAssignableRoles() {
        return List.of("HEAD", "MANAGER", "EXECUTIVE");
    }

    public UserSettingsResponse createUser(UserSettingsRequest request) {
        validateRequest(request, true);

        if (Boolean.TRUE.equals(userRepository.existsByUsername(request.getUsername().trim()))) {
            throw new IllegalArgumentException("Username already exists.");
        }
        if (Boolean.TRUE.equals(userRepository.existsByEmail(request.getEmail().trim()))) {
            throw new IllegalArgumentException("Email already exists.");
        }

        Role role = getOrCreateRole(request.getRole());

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPageAccessCsv(toCsv(request.getAllowedPages()));

        Set<Role> roles = new HashSet<>();
        roles.add(role);
        user.setRoles(roles);

        return toResponse(userRepository.save(user));
    }

    public UserSettingsResponse updateUser(Long id, UserSettingsRequest request) {
        validateRequest(request, false);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        String normalizedUsername = request.getUsername().trim();
        String normalizedEmail = request.getEmail().trim();

        if (!normalizedUsername.equals(user.getUsername())
                && Boolean.TRUE.equals(userRepository.existsByUsername(normalizedUsername))) {
            throw new IllegalArgumentException("Username already exists.");
        }

        if (!normalizedEmail.equals(user.getEmail())
                && Boolean.TRUE.equals(userRepository.existsByEmail(normalizedEmail))) {
            throw new IllegalArgumentException("Email already exists.");
        }

        Role role = getOrCreateRole(request.getRole());

        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPageAccessCsv(toCsv(request.getAllowedPages()));

        if (StringUtils.hasText(request.getPassword())) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        Set<Role> roles = new HashSet<>();
        roles.add(role);
        user.setRoles(roles);

        return toResponse(userRepository.save(user));
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        boolean isHead = user.getRoles().stream().anyMatch(r -> "HEAD".equalsIgnoreCase(r.getName()));
        if (isHead) {
            throw new IllegalArgumentException("HEAD user cannot be deleted.");
        }

        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public List<String> getAllowedPagesByUsername(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return List.of();
        }
        return fromCsv(user.getPageAccessCsv());
    }

    private void validateRequest(UserSettingsRequest request, boolean isCreate) {
        if (request == null) {
            throw new IllegalArgumentException("Invalid request.");
        }

        if (!StringUtils.hasText(request.getUsername())) {
            throw new IllegalArgumentException("Username is required.");
        }
        if (!StringUtils.hasText(request.getEmail())) {
            throw new IllegalArgumentException("Email is required.");
        }
        if (!StringUtils.hasText(request.getRole())) {
            throw new IllegalArgumentException("Role is required.");
        }

        String role = request.getRole().trim().toUpperCase();
        if (!ALLOWED_ROLES.contains(role)) {
            throw new IllegalArgumentException("Invalid role.");
        }

        if (isCreate && !StringUtils.hasText(request.getPassword())) {
            throw new IllegalArgumentException("Password is required.");
        }
    }

    private Role getOrCreateRole(String roleName) {
        String normalized = roleName.trim().toUpperCase();
        return roleRepository.findByName(normalized)
                .orElseGet(() -> roleRepository.save(new Role(null, normalized)));
    }

    private UserSettingsResponse toResponse(User user) {
        String primaryRole = user.getRoles().stream()
                .map(Role::getName)
                .findFirst()
                .orElse("EXECUTIVE");

        return new UserSettingsResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                primaryRole,
                fromCsv(user.getPageAccessCsv())
        );
    }

    private String toCsv(List<String> values) {
        if (values == null || values.isEmpty()) {
            return "";
        }
        return values.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .collect(Collectors.joining(","));
    }

    private List<String> fromCsv(String csv) {
        if (!StringUtils.hasText(csv)) {
            return List.of();
        }
        return List.of(csv.split(",")).stream()
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
    }
}
