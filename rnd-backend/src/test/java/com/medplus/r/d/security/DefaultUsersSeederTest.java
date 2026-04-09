package com.medplus.r.d.security;

import com.medplus.r.d.entity.Role;
import com.medplus.r.d.entity.User;
import com.medplus.r.d.repository.RoleRepository;
import com.medplus.r.d.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DefaultUsersSeederTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private DefaultUsersSeeder seeder;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(seeder, "headUsername", "head-user");
        ReflectionTestUtils.setField(seeder, "headEmail", "head@example.com");
        ReflectionTestUtils.setField(seeder, "headPassword", "top-secret");
        ReflectionTestUtils.setField(seeder, "seedEnabled", true);
        ReflectionTestUtils.setField(seeder, "migrateLegacyRoles", false);

        when(roleRepository.findByName("HEAD")).thenReturn(Optional.of(new Role(1L, "HEAD")));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(new Role(2L, "MANAGER")));
        when(roleRepository.findByName("EXECUTIVE")).thenReturn(Optional.of(new Role(3L, "EXECUTIVE")));
    }

    @Test
    void ensureDefaultUsers_doesNotDeleteExistingUsersWhenLegacyRolesFound() {
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(new Role(10L, "ADMIN")));
        when(userRepository.findByUsernameOrEmail("head-user", "head@example.com")).thenReturn(Optional.of(new User()));

        seeder.ensureDefaultUsers();

        verify(userRepository, never()).deleteAllInBatch();
        verify(roleRepository, never()).deleteAllInBatch();
    }

    @Test
    void ensureDefaultUsers_createsHeadUserOnlyWhenMissing() {
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.empty());
        when(roleRepository.findByName("LAB_INCHARGE")).thenReturn(Optional.empty());
        when(userRepository.findByUsernameOrEmail("head-user", "head@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("top-secret")).thenReturn("encoded-secret");

        seeder.ensureDefaultUsers();

        verify(passwordEncoder).encode("top-secret");
        verify(userRepository).save(any(User.class));
    }
}
