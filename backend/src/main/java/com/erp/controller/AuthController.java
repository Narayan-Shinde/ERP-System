package com.erp.controller;

import com.erp.dto.AuthRequest;
import com.erp.dto.AuthResponse;
import com.erp.dto.RegisterRequest;
import com.erp.model.User;
import com.erp.repository.UserRepository;
import com.erp.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Set;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired private AuthenticationManager authenticationManager;
    @Autowired private UserDetailsService userDetailsService;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
            String token = jwtUtil.generateToken(userDetails.getUsername());
            User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
            return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getUsername(),
                user.getFullName(), user.getRoles(), user.getEmail(), user.getPhone(), user.isActive()));
        } catch (DisabledException | LockedException e) {
            return ResponseEntity.status(403).body("Account is deactivated. Contact administrator.");
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body("Invalid username or password");
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401).body("Authentication failed");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty())
            return ResponseEntity.badRequest().body("Username is required");
        if (request.getEmail() == null || request.getEmail().trim().isEmpty())
            return ResponseEntity.badRequest().body("Email is required");
        if (request.getPassword() == null || request.getPassword().trim().isEmpty())
            return ResponseEntity.badRequest().body("Password is required");
        if (request.getFullName() == null || request.getFullName().trim().isEmpty())
            return ResponseEntity.badRequest().body("Full name is required");
        if (request.getPhone() == null || request.getPhone().trim().isEmpty())
            return ResponseEntity.badRequest().body("Phone number is required");

        // ── Email: proper pattern ──
        if (!request.getEmail().matches("^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"))
            return ResponseEntity.badRequest().body("Email invalid! Got: " + request.getEmail());

        // ── Phone: 10 digits, starts 6-9 ──
        String cleanPhone = request.getPhone().trim().replaceAll("[\\s\\-()]", "");
        if (!cleanPhone.matches("^[6-9]\\d{9}$"))
            return ResponseEntity.badRequest().body("Phone invalid! 10 digits, 6-9 se start. Got: " + request.getPhone());

        // ── Password: min 8 + 1 digit ──
        if (request.getPassword().length() < 8)
            return ResponseEntity.badRequest().body("Password min 8 characters cha hava!");
        if (!request.getPassword().matches(".*\\d.*"))
            return ResponseEntity.badRequest().body("Password madhe at least 1 number hava!");

        // ── Username: 3-20, starts with letter ──
        if (!request.getUsername().matches("^[a-zA-Z][a-zA-Z0-9_]{2,19}$"))
            return ResponseEntity.badRequest().body("Username: letter se start, 3-20 chars only");

        // ── Duplicate checks ──
        if (userRepository.existsByUsername(request.getUsername()))
            return ResponseEntity.badRequest().body("Username '" + request.getUsername() + "' already exists!");
        if (userRepository.existsByEmail(request.getEmail()))
            return ResponseEntity.badRequest().body("Email '" + request.getEmail() + "' already registered!");
        final String cp3 = cleanPhone;
        if (userRepository.findAll().stream().anyMatch(u -> cp3.equals(u.getPhone() != null ? u.getPhone().trim().replaceAll("[\\s\\-()]","") : "")))
            return ResponseEntity.badRequest().body("Phone '" + cleanPhone + "' already registered!");

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setPhone(request.getPhone());
        user.setRoles(Set.of(request.getRole() != null ? request.getRole() : "ROLE_ACCOUNTANT"));
        userRepository.save(user);
        return ResponseEntity.ok("User registered successfully");
    }
}