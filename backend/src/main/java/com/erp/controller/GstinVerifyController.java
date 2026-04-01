package com.erp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/gstin")
@CrossOrigin(origins = "*")
public class GstinVerifyController {

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(8))
        .build();
    private final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/verify/{gstin}")
    public ResponseEntity<?> verifyGSTIN(@PathVariable String gstin) {
        String g = gstin.trim().toUpperCase();

        // Validate format
        if (g.length() != 15)
            return ResponseEntity.badRequest().body(Map.of("error", "GSTIN 15 characters cha hava"));
        if (!g.matches("^(0[1-9]|[1-2][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$"))
            return ResponseEntity.badRequest().body(Map.of("error", "GSTIN format invalid"));

        // Try multiple GST lookup APIs
        List<String> urls = List.of(
            // Primary: taxpayerapi.in - most reliable free GSTIN lookup
            "https://taxpayerapi.in/api/gstincheck?gstin=" + g,
            // Secondary: gstincheck
            "https://sheet.gstincheck.co.in/check/" + g,
            // Tertiary: apisetu
            "https://api.apisetu.gov.in/dictionary/v3/gstn/search?gstin=" + g
        );

        for (String url : urls) {
            try {
                HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .header("User-Agent", "Mozilla/5.0 (ERP System)")
                    .timeout(Duration.ofSeconds(6))
                    .GET()
                    .build();

                HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

                if (resp.statusCode() == 200) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> raw = mapper.readValue(resp.body(), Map.class);
                    Map<String, Object> parsed = parseGSTResponse(raw, g);
                    if (parsed.get("name") != null && !parsed.get("name").toString().isEmpty()) {
                        return ResponseEntity.ok(parsed);
                    }
                }
            } catch (Exception e) {
                // try next URL
            }
        }

        // All APIs failed — return parsed data from GSTIN itself
        return ResponseEntity.ok(fallbackParse(g));
    }

    private Map<String, Object> parseGSTResponse(Map<String, Object> data, String gstin) {
        String stateCode = gstin.substring(0, 2);
        String pan       = gstin.substring(2, 12);
        String stateName = getStateName(stateCode);

        String legalName = getStr(data, "lgnm", "legal_name", "legalName", "name");
        String tradeName = getStr(data, "tradeNam", "trade_name", "tradeName", "businessName");
        String name      = !legalName.isEmpty() ? legalName : tradeName;

        // Address — handle pradr structure
        Map<String, Object> addr = new LinkedHashMap<>();
        Object pradr = data.get("pradr");
        if (pradr instanceof Map) {
            Object addrObj = ((Map<?,?>)pradr).get("addr");
            if (addrObj instanceof Map) addr = (Map<String,Object>) addrObj;
            else addr = (Map<String,Object>) pradr;
        }

        String bno      = getStrMap(addr, "bno", "flat", "flno");
        String bnm      = getStrMap(addr, "bnm", "building");
        String street   = getStrMap(addr, "st",  "street", "road");
        String locality = getStrMap(addr, "loc", "locality", "area", "village");
        String district = getStrMap(addr, "dst", "district", "city");
        String pincode  = getStrMap(addr, "pncd","pincode", "pin");
        String addrState= getStateName(getStrMap(addr, "stcd"));
        if (addrState.isEmpty()) addrState = stateName;

        List<String> addrParts = new ArrayList<>();
        if (!bno.isEmpty()) addrParts.add(bno);
        if (!bnm.isEmpty()) addrParts.add(bnm);
        if (!street.isEmpty()) addrParts.add(street);
        if (!locality.isEmpty()) addrParts.add(locality);
        String fullAddr = String.join(", ", addrParts);

        String status    = getStr(data, "sts", "status", "gstStatus");
        boolean cancelled = status.toLowerCase().contains("cancel");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name",      name);
        result.put("legalName", legalName);
        result.put("tradeName", tradeName);
        result.put("address",   fullAddr);
        result.put("street",    street);
        result.put("locality",  locality);
        result.put("district",  district.isEmpty() ? "" : district);
        result.put("city",      district);
        result.put("state",     addrState.isEmpty() ? stateName : addrState);
        result.put("stateName", stateName);
        result.put("pincode",   pincode);
        result.put("fullAddr",  fullAddr);
        result.put("pan",       pan);
        result.put("stateCode", stateCode);
        result.put("status",    status.isEmpty() ? "Active" : status);
        result.put("cancelled", cancelled);
        result.put("gstin",     gstin);
        return result;
    }

    private Map<String, Object> fallbackParse(String gstin) {
        String stateCode = gstin.substring(0, 2);
        String pan       = gstin.substring(2, 12);
        String stateName = getStateName(stateCode);
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("name", ""); r.put("legalName", ""); r.put("tradeName", "");
        r.put("address",""); r.put("street",""); r.put("locality","");
        r.put("district",""); r.put("city",""); r.put("state", stateName);
        r.put("stateName", stateName); r.put("pincode",""); r.put("fullAddr","");
        r.put("pan", pan); r.put("stateCode", stateCode);
        r.put("status","UNVERIFIED"); r.put("cancelled", false); r.put("gstin", gstin);
        r.put("note", "GSTIN format valid. Name/address could not be fetched from API. State: "+stateName);
        return r;
    }

    private String getStr(Map<String,Object> m, String... keys) {
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null && !v.toString().isEmpty()) return v.toString().trim();
        }
        return "";
    }

    private String getStrMap(Map<String,Object> m, String... keys) {
        if (m == null) return "";
        return getStr(m, keys);
    }

    private String getStateName(String code) {
        if (code == null || code.isEmpty()) return "";
        Map<String,String> states = new LinkedHashMap<>();
        states.put("01","Jammu & Kashmir"); states.put("02","Himachal Pradesh");
        states.put("03","Punjab"); states.put("04","Chandigarh");
        states.put("05","Uttarakhand"); states.put("06","Haryana");
        states.put("07","Delhi"); states.put("08","Rajasthan");
        states.put("09","Uttar Pradesh"); states.put("10","Bihar");
        states.put("11","Sikkim"); states.put("12","Arunachal Pradesh");
        states.put("13","Nagaland"); states.put("14","Manipur");
        states.put("15","Mizoram"); states.put("16","Tripura");
        states.put("17","Meghalaya"); states.put("18","Assam");
        states.put("19","West Bengal"); states.put("20","Jharkhand");
        states.put("21","Odisha"); states.put("22","Chhattisgarh");
        states.put("23","Madhya Pradesh"); states.put("24","Gujarat");
        states.put("25","Daman & Diu"); states.put("26","Dadra & Nagar Haveli");
        states.put("27","Maharashtra"); states.put("28","Andhra Pradesh (old)");
        states.put("29","Karnataka"); states.put("30","Goa");
        states.put("31","Lakshadweep"); states.put("32","Kerala");
        states.put("33","Tamil Nadu"); states.put("34","Puducherry");
        states.put("35","Andaman & Nicobar"); states.put("36","Telangana");
        states.put("37","Andhra Pradesh"); states.put("38","Ladakh");
        states.put("97","Other Territory"); states.put("99","Centre Jurisdiction");
        return states.getOrDefault(code, "");
    }
}
