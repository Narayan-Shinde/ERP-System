package com.erp.config;

import com.erp.security.JwtFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Autowired private JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/gstin/verify/**").authenticated()
                .requestMatchers("/api/auth/register").hasRole("ADMIN")
                .requestMatchers("/api/audit/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                .requestMatchers("/api/users/change-password").authenticated()
                .requestMatchers("/api/users/**").hasRole("ADMIN")
                .requestMatchers("/api/purchase/**")
                    .hasAnyRole("ADMIN","ACCOUNTANT","PURCHASE_EXECUTIVE","MANAGER")
                .requestMatchers("/api/sales/**")
                    .hasAnyRole("ADMIN","ACCOUNTANT","SALES_EXECUTIVE","MANAGER")
                .requestMatchers("/api/customers/**")
                    .hasAnyRole("ADMIN","ACCOUNTANT","SALES_EXECUTIVE","MANAGER")
                .requestMatchers("/api/suppliers/**")
                    .hasAnyRole("ADMIN","ACCOUNTANT","PURCHASE_EXECUTIVE","MANAGER")
                .requestMatchers("/api/expense/**").hasAnyRole("ADMIN","ACCOUNTANT","MANAGER")
                .requestMatchers("/api/accounting/**").hasAnyRole("ADMIN","ACCOUNTANT","MANAGER")
                .requestMatchers("/api/ledger/**").hasAnyRole("ADMIN","ACCOUNTANT","MANAGER")
                .requestMatchers("/api/inventory/**")
                    .hasAnyRole("ADMIN","ACCOUNTANT","PURCHASE_EXECUTIVE","MANAGER")
                .requestMatchers("/api/gst/**").hasAnyRole("ADMIN","ACCOUNTANT","MANAGER")
                .requestMatchers("/api/reports/dashboard").authenticated()
                .requestMatchers("/api/reports/**").hasAnyRole("ADMIN","ACCOUNTANT","MANAGER")
                // ── New endpoints ──
                .requestMatchers("/api/sales/recurring/**").hasAnyRole("ADMIN","ACCOUNTANT","SALES_EXECUTIVE","MANAGER")
                .requestMatchers("/api/inventory/transfers/**").hasAnyRole("ADMIN","ACCOUNTANT","PURCHASE_EXECUTIVE","MANAGER")
                .requestMatchers("/api/bank-statements/**").hasAnyRole("ADMIN","ACCOUNTANT","MANAGER")
                .requestMatchers("/api/gst/gstr1/export-json").hasAnyRole("ADMIN","ACCOUNTANT","MANAGER")
                .requestMatchers("/api/settings/**").hasAnyRole("ADMIN","ACCOUNTANT")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        String allowedOrigins = System.getenv("CORS_ALLOWED_ORIGINS");
        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            config.setAllowedOriginPatterns(List.of(allowedOrigins.split(",")));
        } else {
            config.setAllowedOriginPatterns(List.of("http://localhost:3000", "http://localhost:*", "http://127.0.0.1:*"));
        }
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }
}