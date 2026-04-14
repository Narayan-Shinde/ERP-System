package com.erp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class HsnApiService {

    private final List<HsnEntry> ALL_HSN = new ArrayList<>();

    private static final Set<String> STOP_WORDS = new HashSet<>(Arrays.asList(
        "OF","AND","THE","IN","FOR","TO","WITH","AS","BY","ON","OR","AN","A","AT",
        "FROM","IS","ARE","BE","BEEN","WAS","OTHER","OTHERS","NOT","NO","NE","EX"
    ));

    private static final Set<String> MEDICAL_WORDS = new HashSet<>(Arrays.asList(
        "SURGICAL","MEDICAL","MEDICINAL","PHARMACEUTICAL","CLINICAL","HOSPITAL",
        "THERAPEUTIC","STERILE","DRESSING","BANDAGE","PLASTER","SUTURE","OSTOMY"
    ));

    private static final Map<String, String[]> ALIASES = new LinkedHashMap<>();

    static {
        ALIASES.put("BOPP TAPE",new String[]{"BIAXIALLY ORIENTED POLYPROPYLENE","SELF ADHESIVE","PACKING TAPE"});
        ALIASES.put("BOPP PACKING TAPE",new String[]{"BIAXIALLY ORIENTED POLYPROPYLENE","SELF ADHESIVE","PACKING TAPE"});
        ALIASES.put("CELLO TAPE",new String[]{"CELLULOSE ADHESIVE TAPE","SELF ADHESIVE","TRANSPARENT TAPE"});
        ALIASES.put("CELLOTAPE",new String[]{"CELLULOSE ADHESIVE TAPE","SELF ADHESIVE"});
        ALIASES.put("TRANSPARENT TAPE",new String[]{"CELLULOSE ADHESIVE TAPE","SELF ADHESIVE"});
        ALIASES.put("PACKING TAPE",new String[]{"SELF ADHESIVE","POLYPROPYLENE TAPE","BOPP"});
        ALIASES.put("DOUBLE SIDED TAPE",new String[]{"DOUBLE SIDED SELF ADHESIVE","SELF ADHESIVE"});
        ALIASES.put("MASKING TAPE",new String[]{"MASKING TAPE","RUBBERISED TEXTILE"});
        ALIASES.put("ADHESIVE TAPE",new String[]{"SELF ADHESIVE","POLYPROPYLENE","CELLULOSE ADHESIVE TAPE"});
        ALIASES.put("INSULATION TAPE",new String[]{"ELECTRICAL INSULATING","SELF ADHESIVE"});
        ALIASES.put("BOPP",new String[]{"BIAXIALLY ORIENTED POLYPROPYLENE","POLYPROPYLENE FILM"});
        ALIASES.put("BOPP FILM",new String[]{"POLYPROPYLENE FILM","BIAXIALLY ORIENTED POLYPROPYLENE"});
        ALIASES.put("PLASTIC BAG",new String[]{"SACKS AND BAGS","POLYETHYLENE","PLASTICS"});
        ALIASES.put("PLASTIC FILM",new String[]{"POLYPROPYLENE FILM","POLYETHYLENE FILM","PLASTICS"});
        ALIASES.put("PE FILM",new String[]{"POLYETHYLENE FILM","PLASTICS"});
        ALIASES.put("PVC",new String[]{"POLYVINYL CHLORIDE","PVC","PLASTICS"});
        ALIASES.put("HDPE",new String[]{"HIGH DENSITY POLYETHYLENE","HDPE","POLYETHYLENE"});
        ALIASES.put("LDPE",new String[]{"LOW DENSITY POLYETHYLENE","LDPE","POLYETHYLENE"});
        ALIASES.put("PP BAG",new String[]{"POLYPROPYLENE SACKS","WOVEN SACKS","POLYPROPYLENE BAGS"});
        ALIASES.put("WOVEN SACK",new String[]{"WOVEN SACKS","POLYPROPYLENE SACKS","JUTE SACKS"});
        ALIASES.put("LAPTOP",new String[]{"LAPTOP COMPUTERS","NOTEBOOK COMPUTERS","PORTABLE PERSONAL COMPUTERS"});
        ALIASES.put("COMPUTER",new String[]{"PERSONAL COMPUTER","AUTOMATIC DATA PROCESSING","LAPTOP"});
        ALIASES.put("DESKTOP",new String[]{"PERSONAL COMPUTER","AUTOMATIC DATA PROCESSING MACHINE"});
        ALIASES.put("PC",new String[]{"PERSONAL COMPUTER","AUTOMATIC DATA PROCESSING"});
        ALIASES.put("MOBILE",new String[]{"SMARTPHONES","MOBILE PHONES","TELEPHONE SETS","CELLULAR"});
        ALIASES.put("PHONE",new String[]{"SMARTPHONES","MOBILE PHONES","TELEPHONE SETS"});
        ALIASES.put("SMARTPHONE",new String[]{"SMARTPHONES","MOBILE PHONES","CELLULAR"});
        ALIASES.put("TV",new String[]{"COLOUR TELEVISION SETS","LED TV","LCD TV","TELEVISION"});
        ALIASES.put("LED TV",new String[]{"COLOUR TELEVISION SETS","LED TV","TELEVISION"});
        ALIASES.put("AC",new String[]{"AIR CONDITIONERS","AIR CONDITIONING","SPLIT AC"});
        ALIASES.put("AIR CONDITIONER",new String[]{"AIR CONDITIONERS","AIR CONDITIONING"});
        ALIASES.put("SPLIT AC",new String[]{"SPLIT TYPE AIR CONDITIONING","AIR CONDITIONERS"});
        ALIASES.put("FRIDGE",new String[]{"REFRIGERATORS","COMBINED REFRIGERATOR","FREEZER"});
        ALIASES.put("REFRIGERATOR",new String[]{"REFRIGERATORS","COMBINED REFRIGERATOR"});
        ALIASES.put("WASHING MACHINE",new String[]{"WASHING MACHINES","LAUNDRY"});
        ALIASES.put("CHARGER",new String[]{"BATTERY CHARGERS","MOBILE CHARGERS","STATIC CONVERTERS"});
        ALIASES.put("BATTERY",new String[]{"LITHIUM ION BATTERIES","ELECTRIC ACCUMULATORS","PRIMARY CELLS"});
        ALIASES.put("LED BULB",new String[]{"LIGHT-EMITTING DIODE","LED LAMPS","LAMPS"});
        ALIASES.put("BULB",new String[]{"FILAMENT LAMPS","LED","ELECTRIC FILAMENT"});
        ALIASES.put("SOLAR PANEL",new String[]{"SOLAR CELLS","PHOTOVOLTAIC","SOLAR"});
        ALIASES.put("INVERTER",new String[]{"STATIC CONVERTERS","INVERTERS","TRANSFORMERS"});
        ALIASES.put("UPS",new String[]{"UNINTERRUPTED POWER SUPPLY","STATIC CONVERTERS"});
        ALIASES.put("WATER PURIFIER",new String[]{"WATER FILTERS","HOUSEHOLD WATER PURIFIERS","RO SYSTEMS"});
        ALIASES.put("PRINTER",new String[]{"INK JET PRINTING MACHINES","LASER PRINTERS","PRINTING MACHINES"});
        ALIASES.put("SCANNER",new String[]{"OPTICAL READERS","BARCODE READERS","SCANNERS"});
        ALIASES.put("SPEAKER",new String[]{"LOUDSPEAKERS","AUDIO SPEAKERS","SOUND REPRODUCTION"});
        ALIASES.put("HEADPHONE",new String[]{"HEADPHONES","EARPHONES","SOUND REPRODUCING"});
        ALIASES.put("EARPHONE",new String[]{"EARPHONES","HEADPHONES","EARBUDS"});
        ALIASES.put("MONITOR",new String[]{"VIDEO MONITORS","CATHODE RAY TUBE","FLAT PANEL DISPLAY"});
        ALIASES.put("HARD DISK",new String[]{"MAGNETIC DISC STORAGE UNITS","STORAGE UNITS","HARD DISC"});
        ALIASES.put("PEN DRIVE",new String[]{"USB FLASH DRIVES","FLASH MEMORY STORAGE","DATA STORAGE"});
        ALIASES.put("CAMERA",new String[]{"DIGITAL CAMERAS","PHOTOGRAPHIC CAMERAS","VIDEO CAMERAS"});
        ALIASES.put("CCTV",new String[]{"CLOSED CIRCUIT TV CAMERAS","SURVEILLANCE CAMERAS","VIDEO SURVEILLANCE"});
        ALIASES.put("TMT BAR",new String[]{"TMT BARS","REINFORCEMENT BARS","IRON BARS"});
        ALIASES.put("IRON ROD",new String[]{"BARS AND RODS","TMT BARS","IRON"});
        ALIASES.put("MS PIPE",new String[]{"SEAMLESS TUBES PIPES","GI PIPES","IRON STEEL"});
        ALIASES.put("GI PIPE",new String[]{"SEAMLESS TUBES PIPES","GI PIPES","GALVANISED"});
        ALIASES.put("CEMENT",new String[]{"ORDINARY PORTLAND CEMENT","BLENDED CEMENT","PORTLAND CEMENT"});
        ALIASES.put("OPC CEMENT",new String[]{"ORDINARY PORTLAND CEMENT","OPC"});
        ALIASES.put("PPC CEMENT",new String[]{"PORTLAND POZZOLANA CEMENT","PPC","BLENDED CEMENT"});
        ALIASES.put("GRANITE",new String[]{"GRANITE SLABS","NATURAL STONE","GRANITE TILES"});
        ALIASES.put("MARBLE",new String[]{"MARBLE TILES","TRAVERTINE","ALABASTER"});
        ALIASES.put("CERAMIC TILE",new String[]{"CERAMIC TILES","PORCELAIN TILES","CERAMIC FLAGSTONES"});
        ALIASES.put("VITRIFIED TILE",new String[]{"VITRIFIED TILES","CERAMIC TILES","PORCELAIN TILES"});
        ALIASES.put("COPPER WIRE",new String[]{"COPPER WIRE","ELECTRICAL CONDUCTORS","COPPER"});
        ALIASES.put("WIRE",new String[]{"ELECTRICAL CONDUCTORS","WINDING WIRE","COPPER WIRE"});
        ALIASES.put("CABLE",new String[]{"INSULATED WIRE","COAXIAL CABLE","CABLES"});
        ALIASES.put("SWITCH",new String[]{"ELECTRICAL SWITCHES","CIRCUIT BREAKERS","SWITCHGEAR"});
        ALIASES.put("MCB",new String[]{"MINIATURE CIRCUIT BREAKERS","MCB","CIRCUIT BREAKERS"});
        ALIASES.put("PAINT",new String[]{"PAINTS","VARNISHES","PIGMENTS"});
        ALIASES.put("PUTTY",new String[]{"WALL PUTTY","GLAZIERS PUTTY","ACRYLIC PUTTY"});
        ALIASES.put("BRICK",new String[]{"BRICKS","BUILDING BRICKS","COMMON BRICKS"});
        ALIASES.put("GLASS",new String[]{"FLOAT GLASS","SAFETY GLASS","GLASS"});
        ALIASES.put("PLYWOOD",new String[]{"PLYWOOD","VENEERED PANELS","WOODEN PANELS"});
        ALIASES.put("MDF",new String[]{"MEDIUM DENSITY FIBREBOARD","MDF","FIBRE BOARD"});
        ALIASES.put("COTTON FABRIC",new String[]{"WOVEN FABRICS OF COTTON","COTTON CLOTH","COTTON"});
        ALIASES.put("POLYESTER FABRIC",new String[]{"WOVEN FABRICS OF SYNTHETIC","POLYESTER FABRICS"});
        ALIASES.put("DENIM",new String[]{"DENIM FABRIC","COTTON DENIM","JEANS FABRIC"});
        ALIASES.put("T-SHIRT",new String[]{"T-SHIRTS SINGLETS","KNITTED OR CROCHETED","VESTS"});
        ALIASES.put("TSHIRT",new String[]{"T-SHIRTS","SINGLETS","KNITTED OR CROCHETED"});
        ALIASES.put("JEANS",new String[]{"TROUSERS OF COTTON","DENIM TROUSERS","MENS TROUSERS"});
        ALIASES.put("SHIRT",new String[]{"SHIRTS","MENS SHIRTS","WOVEN SHIRTS"});
        ALIASES.put("SAREE",new String[]{"SAREES","WOVEN FABRICS OF COTTON","SILK SAREES"});
        ALIASES.put("SHOE",new String[]{"FOOTWEAR","SHOES","OUTER SOLES"});
        ALIASES.put("CHAPPAL",new String[]{"FOOTWEAR","SANDALS","RUBBER SOLES"});
        ALIASES.put("SANDAL",new String[]{"SANDALS","FOOTWEAR","RUBBER SOLES"});
        ALIASES.put("SPORTS SHOE",new String[]{"SPORTS FOOTWEAR","RUBBER SOLES","ATHLETIC"});
        ALIASES.put("TOWEL",new String[]{"TOWELS","TERRY TOWELLING","COTTON TERRY CLOTH"});
        ALIASES.put("BED SHEET",new String[]{"BED SHEETS","BEDDING LINEN","BED LINEN"});
        ALIASES.put("BLANKET",new String[]{"BLANKETS TRAVELLING RUGS","BLANKETS","WOVEN"});
        ALIASES.put("RICE",new String[]{"HUSKED RICE","MILLED RICE","RICE"});
        ALIASES.put("BASMATI",new String[]{"BASMATI RICE","LONG GRAIN RICE","HUSKED RICE"});
        ALIASES.put("WHEAT",new String[]{"WHEAT","MESLIN","WHEAT FLOUR"});
        ALIASES.put("ATTA",new String[]{"WHEAT FLOUR","FLOUR OF WHEAT","MESLIN"});
        ALIASES.put("MAIDA",new String[]{"REFINED WHEAT FLOUR","FLOUR","WHEAT FLOUR"});
        ALIASES.put("BESAN",new String[]{"GRAM FLOUR","CHICK PEA FLOUR","LEGUMINOUS VEGETABLES"});
        ALIASES.put("SUGAR",new String[]{"CANE SUGAR","BEET SUGAR","REFINED SUGAR"});
        ALIASES.put("JAGGERY",new String[]{"JAGGERY","NON-CENTRIFUGAL CANE SUGAR","GULA"});
        ALIASES.put("SALT",new String[]{"COMMON SALT","EDIBLE SALT","SODIUM CHLORIDE"});
        ALIASES.put("MILK",new String[]{"MILK AND CREAM","SKIMMED MILK","WHOLE MILK"});
        ALIASES.put("BUTTER",new String[]{"BUTTER","DAIRY SPREADS"});
        ALIASES.put("GHEE",new String[]{"GHEE","BUTTER OIL","DAIRY"});
        ALIASES.put("PANEER",new String[]{"FRESH CHEESE CURD","PANEER","CHEESE"});
        ALIASES.put("OIL",new String[]{"EDIBLE OIL","GROUNDNUT OIL","REFINED OIL"});
        ALIASES.put("GROUNDNUT OIL",new String[]{"GROUNDNUT OIL","ARACHIS OIL","EDIBLE OIL"});
        ALIASES.put("SUNFLOWER OIL",new String[]{"SUNFLOWER SEED OIL","EDIBLE OILS","FIXED VEGETABLE OIL"});
        ALIASES.put("MUSTARD OIL",new String[]{"MUSTARD OIL","CRUDE RAPESEED OIL","EDIBLE OIL"});
        ALIASES.put("DAL",new String[]{"LEGUMINOUS VEGETABLES","LENTILS","SPLIT PULSES"});
        ALIASES.put("TOOR DAL",new String[]{"PIGEON PEAS","CAJANUS CAJAN","LEGUMINOUS"});
        ALIASES.put("CHANA DAL",new String[]{"CHICK PEA","DRIED LEGUMINOUS","BENGAL GRAM"});
        ALIASES.put("TEA",new String[]{"TEA","GREEN TEA","BLACK TEA"});
        ALIASES.put("COFFEE",new String[]{"COFFEE","COFFEE BEANS","ROASTED COFFEE"});
        ALIASES.put("BISCUIT",new String[]{"BISCUITS","WAFFLES WAFERS","SWEET BISCUITS"});
        ALIASES.put("NOODLES",new String[]{"NOODLES","PASTA","MACARONI"});
        ALIASES.put("NAMKEEN",new String[]{"NAMKEENS BHUJIA","MIXTURE CRUNCHY","SAVOURY FOOD"});
        ALIASES.put("TURMERIC",new String[]{"TURMERIC","CURCUMA","SPICES"});
        ALIASES.put("CHILLI",new String[]{"CHILLIES PEPPERS","CAPSICUM PEPPER","DRIED CHILLIES"});
        ALIASES.put("CORIANDER",new String[]{"CORIANDER SEEDS","CORIANDER SPICES"});
        ALIASES.put("MEDICINE",new String[]{"MEDICINES TABLETS CAPSULES","MEDICAMENTS FOR HUMAN"});
        ALIASES.put("SOAP",new String[]{"SOAP","DETERGENT","WASHING"});
        ALIASES.put("DETERGENT",new String[]{"DETERGENTS","WASHING PREPARATIONS","SURFACE ACTIVE"});
        ALIASES.put("SHAMPOO",new String[]{"SHAMPOOS","HAIR PREPARATIONS","PREPARATIONS FOR HAIR"});
        ALIASES.put("TOOTHPASTE",new String[]{"TOOTH PASTE DENTAL CREAM","DENTIFRICES","ORAL HYGIENE"});
        ALIASES.put("FERTILIZER",new String[]{"FERTILISERS","NITROGENOUS","PHOSPHATIC"});
        ALIASES.put("PESTICIDE",new String[]{"INSECTICIDES","PESTICIDES","HERBICIDES"});
        ALIASES.put("CAR",new String[]{"MOTOR CARS PASSENGER","PASSENGER VEHICLES","SEDAN SUV"});
        ALIASES.put("TRUCK",new String[]{"MOTOR VEHICLES GOODS","TRUCKS LORRIES"});
        ALIASES.put("BIKE",new String[]{"MOTORCYCLES","SCOOTERS","TWO WHEELED"});
        ALIASES.put("MOTORCYCLE",new String[]{"MOTORCYCLES","ENGINE CAPACITY"});
        ALIASES.put("SCOOTER",new String[]{"SCOOTERS","MOTORCYCLES","TWO WHEELED"});
        ALIASES.put("TYRE",new String[]{"PNEUMATIC TYRES RUBBER","TYRES","RADIAL TYRE"});
        ALIASES.put("ENGINE OIL",new String[]{"LUBRICATING OIL","MINERAL LUBRICATING OIL","MOTOR OIL"});
        ALIASES.put("LPG",new String[]{"PROPANE LIQUEFIED","LPG","COOKING GAS","BUTANE LIQUEFIED"});
        ALIASES.put("PETROL",new String[]{"MOTOR SPIRIT","PETROLEUM OILS","GASOLINE"});
        ALIASES.put("DIESEL",new String[]{"HIGH SPEED DIESEL","GAS OILS","PETROLEUM"});
        ALIASES.put("PAPER",new String[]{"PAPER","NEWSPRINT","KRAFT PAPER"});
        ALIASES.put("PEN",new String[]{"BALL POINT PENS","WRITING PENS","PENS"});
        ALIASES.put("PENCIL",new String[]{"PENCILS","WRITING PENCILS","GRAPHITE PENCILS"});
        ALIASES.put("FURNITURE",new String[]{"FURNITURE","WOODEN FURNITURE","SEATS"});
        ALIASES.put("CHAIR",new String[]{"CHAIRS","SEATS","SWIVEL SEATS"});
        ALIASES.put("SOFA",new String[]{"SOFAS","SETTEES","UPHOLSTERED SEATS"});
        ALIASES.put("MATTRESS",new String[]{"MATTRESSES","SLEEPING BAGS","QUILTS"});
        ALIASES.put("CARPET",new String[]{"CARPETS","TEXTILE FLOOR COVERINGS","RUGS"});
        ALIASES.put("GOLD",new String[]{"GOLD","UNWROUGHT GOLD","ARTICLES OF GOLD"});
        ALIASES.put("SILVER",new String[]{"SILVER","UNWROUGHT SILVER"});
        ALIASES.put("JEWELLERY",new String[]{"JEWELLERY","ARTICLES OF GOLD","ORNAMENTS"});
        ALIASES.put("CARTON",new String[]{"CARTONS BOXES CASES","CORRUGATED PAPER CARTON"});
        ALIASES.put("BOTTLE",new String[]{"GLASS BOTTLES JARS","PLASTIC BOTTLES","CONTAINERS"});
        ALIASES.put("BAG",new String[]{"SACKS AND BAGS","POLYETHYLENE BAGS","WOVEN SACKS"});
        ALIASES.put("POUCH",new String[]{"POUCHES SACHETS","FLEXIBLE PACKAGING","PLASTIC BAGS"});
        ALIASES.put("BUBBLE WRAP",new String[]{"BUBBLE WRAP","POLYTHENE PACKAGING","PROTECTIVE PACKAGING"});
        ALIASES.put("DRILL",new String[]{"DRILLING MACHINES","ELECTRIC DRILLS","HAND TOOLS"});
        ALIASES.put("SCREW",new String[]{"SCREWS BOLTS NUTS","THREADED FASTENERS","IRON STEEL"});
        ALIASES.put("PUMP",new String[]{"PUMPS LIQUIDS","CENTRIFUGAL PUMPS","AIR PUMPS"});
        ALIASES.put("MOTOR",new String[]{"ELECTRIC MOTORS","AC MOTORS","DC MOTORS"});
        ALIASES.put("GENERATOR",new String[]{"ELECTRIC GENERATING SETS","GENERATORS","GENSETS"});
        ALIASES.put("TRANSFORMER",new String[]{"TRANSFORMERS","ELECTRICAL TRANSFORMERS","POWER TRANSFORMERS"});
        ALIASES.put("BEARING",new String[]{"BALL BEARINGS","ROLLER BEARINGS","BEARINGS"});
    }

    @PostConstruct
    public void init() {
        try {
            ClassPathResource res = new ClassPathResource("HSN_SAC.json");
            if (!res.exists()) { log.warn("HSN_SAC.json not found!"); return; }
            ObjectMapper mapper = new ObjectMapper();
            try (InputStream is = res.getInputStream()) {
                JsonNode root = mapper.readTree(is);
                JsonNode sections = root.get("sections");
                if (sections != null && sections.isArray()) {
                    for (JsonNode sec : sections) {
                        JsonNode codes = sec.get("codes");
                        if (codes == null || !codes.isArray()) continue;
                        for (JsonNode c : codes) {
                            String hsn  = c.has("hsn")  ? c.get("hsn").asText().trim()  : "";
                            String desc = c.has("desc") ? c.get("desc").asText().trim() : "";
                            double gst  = c.has("gst")  ? c.get("gst").asDouble()       : 18.0;
                            if (!hsn.isEmpty() && !desc.isEmpty())
                                ALL_HSN.add(new HsnEntry(hsn, desc.toUpperCase(), gst));
                        }
                    }
                }
            }
            log.info("HSN_SAC.json loaded: {} codes", ALL_HSN.size());
        } catch (Exception e) {
            log.error("HSN load failed: {}", e.getMessage());
        }
    }

    public List<HsnSuggestion> searchByItemName(String itemName, int limit) {
        if (itemName == null || itemName.trim().isEmpty()) return Collections.emptyList();

        String upper = itemName.trim().toUpperCase();
        String[] rawWords = upper.split("\\s+");

        // Meaningful words only (no stop-words, min 2 chars)
        List<String> meaningfulWords = Arrays.stream(rawWords)
            .filter(w -> w.length() >= 2 && !STOP_WORDS.contains(w))
            .collect(Collectors.toList());

        // Expand via aliases
        Set<String> expandedTerms = new LinkedHashSet<>();
        String[] phraseAlias = ALIASES.get(upper);
        if (phraseAlias != null)
            for (String a : phraseAlias) expandedTerms.add(a.toUpperCase());
        for (String w : rawWords) {
            String[] wa = ALIASES.get(w);
            if (wa != null)
                for (String a : wa) expandedTerms.add(a.toUpperCase());
        }

        boolean inputIsMedical = meaningfulWords.stream().anyMatch(MEDICAL_WORDS::contains);

        List<ScoredEntry> scored = new ArrayList<>();
        for (HsnEntry e : ALL_HSN) {
            int score = scoreEntry(e, upper, meaningfulWords, expandedTerms);
            if (score <= 0) continue;
            if (!inputIsMedical && isMedicalEntry(e)) score -= 250;
            if (e.desc.endsWith("- OTHER") || e.desc.endsWith("- OTHERS")) score -= 30;
            int len = e.hsn.length();
            if      (len == 8) score += 120;
            else if (len == 6) score += 50;
            else if (len == 4) score += 15;
            else               score -= 100;
            if (score > 0) scored.add(new ScoredEntry(e, score));
        }

        scored.sort((a, b) -> Integer.compare(b.score, a.score));
        return scored.stream().limit(limit)
            .map(s -> new HsnSuggestion(s.entry.hsn, s.entry.desc, s.entry.gst, "", ""))
            .collect(Collectors.toList());
    }

    private int scoreEntry(HsnEntry e, String fullPhrase, List<String> meaningfulWords, Set<String> expandedTerms) {
        int score = 0;
        String desc = e.desc;

        // 1. Exact full-phrase match — perfect
        if (desc.contains(fullPhrase)) {
            score += 500;
            return score;
        }

        // 2. Individual meaningful word scoring
        int matchCount = 0;
        int totalWordScore = 0;
        for (String w : meaningfulWords) {
            if (desc.contains(w)) {
                matchCount++;
                totalWordScore += (w.length() >= 6) ? w.length() * 5 : w.length() * 2;
            }
        }

        if (matchCount == 0 && expandedTerms.isEmpty()) return 0;
        score += totalWordScore;

        // 3. All-words-AND bonus
        if (!meaningfulWords.isEmpty() && matchCount == meaningfulWords.size()) {
            score += 200 + (meaningfulWords.size() * 20);
        } else if (meaningfulWords.size() > 1 && matchCount >= meaningfulWords.size() - 1) {
            score += 80;
        }

        // 4. Alias/expanded term scoring
        for (String term : expandedTerms) {
            if (term.length() < 3) continue;
            if (desc.contains(term)) score += term.length() * 3;
        }

        // 5. Consecutive word-pair (word-order proximity) bonus
        if (meaningfulWords.size() >= 2) {
            for (int i = 0; i < meaningfulWords.size() - 1; i++) {
                String pair = meaningfulWords.get(i) + " " + meaningfulWords.get(i + 1);
                if (desc.contains(pair)) score += 60;
            }
        }

        // 6. Description starts with a query word
        for (String w : meaningfulWords) {
            if (desc.startsWith(w)) { score += 40; break; }
        }

        return score;
    }

    private boolean isMedicalEntry(HsnEntry e) {
        for (String mw : MEDICAL_WORDS) if (e.desc.contains(mw)) return true;
        return e.hsn.startsWith("30") || e.hsn.startsWith("3005") || e.hsn.startsWith("3006");
    }

    public List<HsnSuggestion> autoCompleteHsnCode(String partialCode, int limit) {
        if (partialCode == null || partialCode.length() < 2) return Collections.emptyList();
        return ALL_HSN.stream()
            .filter(e -> e.hsn.startsWith(partialCode))
            .sorted(Comparator.comparingInt((HsnEntry e) -> e.hsn.length()).thenComparing(e -> e.hsn))
            .limit(limit)
            .map(e -> new HsnSuggestion(e.hsn, e.desc, e.gst, "", ""))
            .collect(Collectors.toList());
    }

    public Optional<HsnSuggestion> getByHsnCode(String code) {
        return ALL_HSN.stream().filter(e -> e.hsn.equals(code)).findFirst()
            .map(e -> new HsnSuggestion(e.hsn, e.desc, e.gst, "", ""));
    }

    public Optional<HsnValidationResult> validateHsnCode(String code) {
        return ALL_HSN.stream().filter(e -> e.hsn.equals(code)).findFirst()
            .map(e -> new HsnValidationResult(e.hsn, e.gst, e.desc, "", true));
    }

    public double getGstRateForHsn(String code) {
        return ALL_HSN.stream().filter(e -> e.hsn.equals(code)).findFirst()
            .map(e -> e.gst).orElse(18.0);
    }

    public List<HsnSuggestion> getSuggestionsByCategory(String itemType, String desc) {
        return searchByItemName((itemType + " " + desc).trim(), 10);
    }

    private static class HsnEntry {
        final String hsn, desc; final double gst;
        HsnEntry(String h, String d, double g) { hsn=h; desc=d; gst=g; }
    }

    private static class ScoredEntry {
        final HsnEntry entry; final int score;
        ScoredEntry(HsnEntry e, int s) { entry=e; score=s; }
    }

    @lombok.Data @lombok.AllArgsConstructor @lombok.NoArgsConstructor
    public static class HsnSuggestion {
        private String hsnCode, description; private double gstRate; private String category, reason;
    }

    @lombok.Data @lombok.AllArgsConstructor @lombok.NoArgsConstructor
    public static class HsnValidationResult {
        private String hsnCode; private double gstRate; private String description, category; private boolean valid;
    }
}
