package com.medplus.r.d.controller;

import com.medplus.r.d.dto.LoginRequest;
import com.medplus.r.d.service.UserSettingsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserSettingsService userSettingsService;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletRequest request,
            HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    loginRequest.getUsername(), loginRequest.getPassword()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            SecurityContextRepository repo = new HttpSessionSecurityContextRepository();
            repo.saveContext(SecurityContextHolder.getContext(), request, response);

            List<String> roles = extractRoles(authentication);
            String primaryRole = roles.isEmpty() ? "EXECUTIVE" : roles.get(0);
            List<String> allowedPages = userSettingsService.getAllowedPagesByUsername(authentication.getName());

            return ResponseEntity.ok(Map.of(
                "message", "User authenticated successfully",
                "username", authentication.getName(),
                "roles", roles,
                "role", primaryRole,
                "allowedPages", allowedPages));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Invalid username or password"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        List<String> roles = extractRoles(authentication);
        String primaryRole = roles.isEmpty() ? "EXECUTIVE" : roles.get(0);
        List<String> allowedPages = userSettingsService.getAllowedPagesByUsername(authentication.getName());

        return ResponseEntity.ok(Map.of(
            "username", authentication.getName(),
            "roles", roles,
            "role", primaryRole,
            "allowedPages", allowedPages));
    }

    @GetMapping("/csrf")
    public ResponseEntity<?> csrf(HttpServletRequest request, CsrfToken csrfToken) {
        CsrfToken resolved = csrfToken;
        if (resolved == null) {
            Object attr = request.getAttribute("_csrf");
            if (attr instanceof CsrfToken token) {
                resolved = token;
            }
        }

        if (resolved == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Unable to initialize CSRF token"));
        }

        return ResponseEntity.ok(Map.of(
            "token", resolved.getToken(),
            "headerName", resolved.getHeaderName(),
            "parameterName", resolved.getParameterName()));
    }

    private List<String> extractRoles(Authentication authentication) {
        return authentication.getAuthorities().stream()
            .map(a -> a.getAuthority())
            .filter(a -> a.startsWith("ROLE_"))
            .map(a -> a.substring("ROLE_".length()))
            .collect(Collectors.toList());
    }
}
