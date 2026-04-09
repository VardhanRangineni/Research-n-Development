package com.medplus.r.d.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:5174}")
    private String corsAllowedOrigins;

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        CsrfTokenRequestAttributeHandler csrfTokenRequestHandler = new CsrfTokenRequestAttributeHandler();

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(csrfTokenRequestHandler)
                .ignoringRequestMatchers("/api/auth/login", "/api/auth/logout"))
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .sessionFixation(fixation -> fixation.migrateSession()))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/api/auth/login", "/api/auth/logout", "/api/auth/csrf").permitAll()

                // ── User / settings management ─ HEAD only ─────────────────────────────
                .requestMatchers("/api/settings/**").hasRole("HEAD")

                // ── Audit trail ─ HEAD and MANAGER ─────────────────────────────────────
                .requestMatchers("/api/audit/**").hasAnyRole("HEAD", "MANAGER")

                // ── Ingredient master: all authenticated users ──────────────────────────
                .requestMatchers("/api/ingredients/**").authenticated()

                // ── Equipment master: all authenticated users ───────────────────────────
                .requestMatchers("/api/equipment/**").authenticated()

                // ── Benchmark master: all authenticated users ───────────────────────────
                .requestMatchers("/api/benchmarks/**").authenticated()

                // ── Batch decision ─ HEAD and MANAGER ──────────────────────────────────
                .requestMatchers(HttpMethod.PUT, "/api/projects/*/batches/*/decision").hasAnyRole("HEAD", "MANAGER")

                // ── Stability protocol creation/config ─ all authenticated users ────────
                .requestMatchers(HttpMethod.POST, "/api/projects/*/stability-protocols").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/projects/*/stability-protocols/*/config").authenticated()

                // ── Stability protocol gate/pass/fail decisions ─ HEAD and MANAGER ──────
                .requestMatchers(HttpMethod.PUT, "/api/projects/*/stability-protocols/*/gate/criteria").hasAnyRole("HEAD", "MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/projects/*/stability-protocols/*/gate/decide").hasAnyRole("HEAD", "MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/projects/*/stability-protocols/simple-result").hasAnyRole("HEAD", "MANAGER")
                .requestMatchers(HttpMethod.POST, "/api/projects/*/stability-protocols/*/simple-result").hasAnyRole("HEAD", "MANAGER")

                // ── Procedure files: all authenticated users ────────────────────────────
                .requestMatchers("/api/procedure-files/**").authenticated()

                // ── Everything else requires authentication ─────────────────────────────
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
                .accessDeniedHandler((request, response, accessDeniedException) ->
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Forbidden")))
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(corsAllowedOrigins.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .collect(Collectors.toList());
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-XSRF-TOKEN"));
        configuration.setExposedHeaders(Arrays.asList("Set-Cookie"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
