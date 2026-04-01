package com.erp.controller;

import com.erp.model.User;
import com.erp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        List<User> users = userRepository.findAll();
        users.forEach(u -> u.setPassword(null));
        return users;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        return userRepository.findById(id).map(u -> {
            u.setPassword(null);
            return ResponseEntity.ok(u);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable String id, @RequestBody Map<String, Object> updated) {
        return userRepository.findById(id).map(u -> {
            String fullName = (String) updated.get("fullName");
            String email    = (String) updated.get("email");
            String phone    = (String) updated.get("phone");

            if (fullName == null || fullName.trim().isEmpty())
                return ResponseEntity.badRequest().body("Full name is required");
            if (email == null || email.trim().isEmpty())
                return ResponseEntity.badRequest().body("Email is required");
            if (phone == null || phone.trim().isEmpty())
                return ResponseEntity.badRequest().body("Phone is required");
            if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))
                return ResponseEntity.badRequest().body("Invalid email format");
            if (!phone.matches("^[6-9]\\d{9}$"))
                return ResponseEntity.badRequest().body("Invalid phone number");

            userRepository.findByEmail(email).ifPresent(existing -> {
                if (!existing.getId().equals(id))
                    throw new RuntimeException("Email already in use by another user");
            });

            u.setFullName(fullName.trim());
            u.setEmail(email.trim());
            u.setPhone(phone.trim());

            @SuppressWarnings("unchecked")
            List<String> roles = (List<String>) updated.get("roles");
            if (roles != null && !roles.isEmpty()) {
                u.setRoles(new java.util.HashSet<>(roles));
            }

            String newPassword = (String) updated.get("password");
            if (newPassword != null && !newPassword.trim().isEmpty()) {
                if (newPassword.length() < 6)
                    return ResponseEntity.badRequest().body("Password must be at least 6 characters");
                u.setPassword(passwordEncoder.encode(newPassword));
            }

            User saved = userRepository.save(u);
            saved.setPassword(null);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/toggle-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleStatus(@PathVariable String id) {
        return userRepository.findById(id).map(u -> {
            if ("admin".equals(u.getUsername()))
                return ResponseEntity.badRequest().body("Cannot deactivate the default admin user");
            u.setActive(!u.isActive());
            userRepository.save(u);
            return ResponseEntity.ok(Map.of(
                    "active", u.isActive(),
                    "message", "User " + (u.isActive() ? "activated" : "deactivated") + " successfully"
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        return userRepository.findById(id).map(u -> {
            if ("admin".equals(u.getUsername()))
                return ResponseEntity.badRequest().body("Cannot delete the default admin user");
            userRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "User '" + u.getUsername() + "' deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changeOwnPassword(@RequestBody Map<String, String> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        String oldPassword = body.get("oldPassword");
        String newPassword = body.get("newPassword");

        if (oldPassword == null || oldPassword.trim().isEmpty())
            return ResponseEntity.badRequest().body("Current password is required");
        if (newPassword == null || newPassword.trim().isEmpty())
            return ResponseEntity.badRequest().body("New password is required");
        if (newPassword.length() < 6)
            return ResponseEntity.badRequest().body("New password must be at least 6 characters");

        return userRepository.findByUsername(username).map(u -> {
            if (!passwordEncoder.matches(oldPassword, u.getPassword()))
                return ResponseEntity.badRequest().body("Current password is incorrect");
            if (oldPassword.equals(newPassword))
                return ResponseEntity.badRequest().body("New password must be different from current password");
            u.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(u);
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }
}