package com.medplus.r.d.security;

import com.medplus.r.d.entity.Role;
import com.medplus.r.d.entity.User;
import com.medplus.r.d.repository.RoleRepository;
import com.medplus.r.d.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DefaultUsersSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DefaultUsersSeeder.class);

    private static final String ROLE_HEAD = "HEAD";
    private static final String ROLE_MANAGER = "MANAGER";
    private static final String ROLE_EXECUTIVE = "EXECUTIVE";

        private static final List<String> ALL_PAGES = List.of(
            "DASHBOARD",
            "PROJECTS",
            "PROCEDURE",
            "DOCUMENTS",
            "CALIBRATION",
            "CALIBRATION_LOGS",
            "MASTERS",
            "AUDIT",
            "SETTINGS"
        );

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${app.head.email}")
    private String headEmail;

    @Value("${app.head.username}")
    private String headUsername;

    @Value("${app.head.password}")
    private String headPassword;

    @Value("${app.seed.default-users.enabled:false}")
    private boolean seedEnabled;

    @Value("${app.seed.migrate-legacy-roles:false}")
    private boolean migrateLegacyRoles;

    @Override
    @Transactional
    public void run(String... args) {
        if (seedEnabled) {
            ensureDefaultUsers();
        }
    }

    @Transactional
    public void ensureDefaultUsers() {
        if (!seedEnabled) {
            return;
        }

        if (!isUserSeedConfigValid(headUsername, headEmail, headPassword)) {
            logger.warn("Default user seeding is enabled, but HEAD user config is incomplete. Skipping seed.");
            return;
        }

        boolean hasLegacyRoles = roleRepository.findByName("ADMIN").isPresent()
            || roleRepository.findByName("LAB_INCHARGE").isPresent();

        if (hasLegacyRoles && !migrateLegacyRoles) {
            logger.warn("Legacy roles detected (ADMIN/LAB_INCHARGE). Automatic destructive migration is disabled.");
        }

        Role headRole = roleRepository.findByName(ROLE_HEAD)
            .orElseGet(() -> roleRepository.save(new Role(null, ROLE_HEAD)));

        roleRepository.findByName(ROLE_MANAGER)
            .orElseGet(() -> roleRepository.save(new Role(null, ROLE_MANAGER)));

        roleRepository.findByName(ROLE_EXECUTIVE)
            .orElseGet(() -> roleRepository.save(new Role(null, ROLE_EXECUTIVE)));

        User head = userRepository.findByUsernameOrEmail(headUsername, headEmail)
            .orElseGet(User::new);

        boolean isNewHead = head.getId() == null;

        if (isNewHead) {
            head.setUsername(headUsername);
            head.setEmail(headEmail);
            head.setPassword(passwordEncoder.encode(headPassword));
            head.setPageAccessCsv(ALL_PAGES.stream().collect(Collectors.joining(",")));
        }

        Set<Role> assignedRoles = new HashSet<>();
        if (head.getRoles() != null) {
            assignedRoles.addAll(head.getRoles());
        }
        assignedRoles.add(headRole);
        head.setRoles(assignedRoles);

        userRepository.save(head);
    }

    private boolean isUserSeedConfigValid(String username, String email, String password) {
        return StringUtils.hasText(username) && StringUtils.hasText(email) && StringUtils.hasText(password);
    }
}
