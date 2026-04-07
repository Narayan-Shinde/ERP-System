package com.erp.config;

import com.erp.model.gst.HsnMaster;
import com.erp.repository.HsnMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Initialize HSN Master data on application startup
 * Seeds the database with common HSN codes and GST rates
 */
@Component
public class HsnDataInitializer implements CommandLineRunner {

    @Autowired
    private HsnMasterRepository hsnRepo;

    @Override
    public void run(String... args) {
        // Only seed if empty
        long count = hsnRepo.count();
        if (count > 0) {
            System.out.println("HSN Master already initialized with " + count + " records");
            return;
        }

        System.out.println("Initializing HSN Master data...");

        List<HsnMaster> hsnList = new ArrayList<>();

        // Food & Agriculture
        hsnList.add(createHsn("0401", 5, "Milk and cream", "Food"));
        hsnList.add(createHsn("0402", 5, "Milk products (curd, etc.)", "Food"));
        hsnList.add(createHsn("0403", 5, "Buttermilk, yogurt, whey", "Food"));
        hsnList.add(createHsn("0406", 5, "Cheese and curd", "Food"));
        hsnList.add(createHsn("0701", 0, "Potatoes, fresh", "Agriculture"));
        hsnList.add(createHsn("0702", 5, "Tomatoes, fresh", "Agriculture"));
        hsnList.add(createHsn("0703", 5, "Onions, shallots, garlic", "Agriculture"));
        hsnList.add(createHsn("0713", 5, "Dried leguminous vegetables", "Agriculture"));
        hsnList.add(createHsn("0803", 0, "Bananas", "Agriculture"));
        hsnList.add(createHsn("0804", 5, "Dates, figs, avocados", "Agriculture"));
        hsnList.add(createHsn("0805", 0, "Citrus fruit", "Agriculture"));
        hsnList.add(createHsn("0901", 5, "Coffee", "Food"));
        hsnList.add(createHsn("0902", 5, "Tea", "Food"));
        hsnList.add(createHsn("0904", 5, "Pepper, spices", "Food"));
        hsnList.add(createHsn("1001", 0, "Wheat and meslin", "Agriculture"));
        hsnList.add(createHsn("1006", 0, "Rice", "Agriculture"));
        hsnList.add(createHsn("1101", 0, "Wheat flour (atta)", "Food"));
        hsnList.add(createHsn("1102", 5, "Cereal flours", "Food"));
        hsnList.add(createHsn("1507", 5, "Soya-bean oil", "Food"));
        hsnList.add(createHsn("1517", 5, "Margarine, edible mixtures", "Food"));
        hsnList.add(createHsn("1701", 5, "Sugar", "Food"));
        hsnList.add(createHsn("1704", 18, "Sugar confectionery", "Food"));
        hsnList.add(createHsn("1806", 18, "Chocolate and cocoa prep", "Food"));
        hsnList.add(createHsn("1901", 18, "Malt extract, food prep", "Food"));
        hsnList.add(createHsn("1902", 18, "Pasta, noodles", "Food"));
        hsnList.add(createHsn("1905", 18, "Bread, bakery", "Food"));
        hsnList.add(createHsn("2005", 12, "Vegetables prepared/preserved", "Food"));
        hsnList.add(createHsn("2009", 12, "Fruit juices", "Food"));
        hsnList.add(createHsn("2106", 18, "Food preparations NEC", "Food"));
        hsnList.add(createHsn("2201", 18, "Water (packaged)", "Beverages"));
        hsnList.add(createHsn("2202", 28, "Aerated drinks (+cess)", "Beverages"));
        hsnList.add(createHsn("2203", 18, "Beer", "Beverages"));
        hsnList.add(createHsn("2204", 18, "Wine", "Beverages"));

        // Tobacco
        hsnList.add(createHsn("2402", 28, "Cigarettes (+cess)", "Tobacco"));
        hsnList.add(createHsn("2404", 28, "Other tobacco (+cess)", "Tobacco"));

        // Minerals & Cement
        hsnList.add(createHsn("2501", 5, "Salt", "Minerals"));
        hsnList.add(createHsn("2523", 28, "Cement (+cess)", "Construction"));

        // Petroleum
        hsnList.add(createHsn("2710", 18, "Petroleum oils (excl bulk)", "Petroleum"));
        hsnList.add(createHsn("2711", 18, "LPG, hydrocarbons", "Petroleum"));

        // Pharmaceuticals
        hsnList.add(createHsn("3004", 12, "Medicaments (formulated)", "Pharma"));
        hsnList.add(createHsn("3006", 12, "Surgical, pharma goods", "Pharma"));

        // Cosmetics & Personal Care
        hsnList.add(createHsn("3303", 18, "Perfumes, toilet waters", "Cosmetics"));
        hsnList.add(createHsn("3304", 18, "Beauty / make-up", "Cosmetics"));
        hsnList.add(createHsn("3305", 18, "Hair preparations", "Cosmetics"));
        hsnList.add(createHsn("3401", 18, "Soap, organic surface-active", "Personal Care"));
        hsnList.add(createHsn("3402", 18, "Detergents", "Personal Care"));

        // Plastics
        hsnList.add(createHsn("3506", 18, "Glues, adhesives", "Chemicals"));
        hsnList.add(createHsn("3917", 18, "Plastic tubes, pipes", "Plastics"));
        hsnList.add(createHsn("3918", 18, "Plastic fittings", "Plastics"));
        hsnList.add(createHsn("3919", 18, "Plastic plates, film", "Plastics"));
        hsnList.add(createHsn("3920", 18, "Plastic sheets", "Plastics"));
        hsnList.add(createHsn("3921", 18, "Plastic plates/sheets finished", "Plastics"));
        hsnList.add(createHsn("3922", 18, "Plastic baths, sanitary", "Plastics"));
        hsnList.add(createHsn("3923", 18, "Plastic articles for conveyance", "Plastics"));
        hsnList.add(createHsn("3924", 18, "Tableware, kitchen plastic", "Plastics"));
        hsnList.add(createHsn("3925", 18, "Builders ware of plastic", "Plastics"));
        hsnList.add(createHsn("3926", 18, "Other plastic articles", "Plastics"));

        // Rubber
        hsnList.add(createHsn("4010", 18, "Conveyor belts, rubber", "Rubber"));
        hsnList.add(createHsn("4011", 28, "New pneumatic tyres", "Rubber"));
        hsnList.add(createHsn("4012", 18, "Retreaded tyres", "Rubber"));
        hsnList.add(createHsn("4013", 18, "Inner tubes", "Rubber"));
        hsnList.add(createHsn("4014", 12, "Hygiene / pharma rubber", "Rubber"));
        hsnList.add(createHsn("4015", 18, "Apparel of rubber", "Rubber"));
        hsnList.add(createHsn("4016", 18, "Other rubber articles", "Rubber"));

        // Leather & Bags
        hsnList.add(createHsn("4202", 18, "Trunks, bags, handbags", "Leather"));
        hsnList.add(createHsn("4303", 5, "Articles of fur", "Leather"));

        // Wood
        hsnList.add(createHsn("4407", 5, "Wood sawn/chipped", "Wood"));
        hsnList.add(createHsn("4410", 12, "Particle board, OSB", "Wood"));
        hsnList.add(createHsn("4412", 18, "Plywood, veneered panels", "Wood"));
        hsnList.add(createHsn("4418", 18, "Builders joinery of wood", "Wood"));
        hsnList.add(createHsn("4419", 12, "Tableware of wood", "Wood"));
        hsnList.add(createHsn("4420", 12, "Wood marquetry, statuettes", "Wood"));
        hsnList.add(createHsn("4421", 18, "Other articles of wood", "Wood"));

        // Paper & Printing
        hsnList.add(createHsn("4819", 12, "Cartons, boxes of paper", "Paper"));
        hsnList.add(createHsn("4820", 12, "Registers, notebooks", "Paper"));
        hsnList.add(createHsn("4821", 12, "Paper labels", "Paper"));
        hsnList.add(createHsn("4823", 12, "Paper cut to shape", "Paper"));
        hsnList.add(createHsn("4901", 12, "Printed books", "Printing"));
        hsnList.add(createHsn("4902", 12, "Newspapers, journals", "Printing"));
        hsnList.add(createHsn("4911", 12, "Other printed matter", "Printing"));

        // Textiles & Clothing
        hsnList.add(createHsn("6103", 5, "Knitted suits, men/boys", "Textiles"));
        hsnList.add(createHsn("6104", 5, "Knitted suits, women", "Textiles"));
        hsnList.add(createHsn("6105", 5, "Knitted shirts", "Textiles"));
        hsnList.add(createHsn("6106", 5, "Knitted blouses", "Textiles"));
        hsnList.add(createHsn("6107", 5, "Knitted undergarments men", "Textiles"));
        hsnList.add(createHsn("6108", 5, "Knitted undergarments women", "Textiles"));
        hsnList.add(createHsn("6109", 5, "T-shirts, vests knitted", "Textiles"));
        hsnList.add(createHsn("6110", 5, "Jerseys, pullovers", "Textiles"));
        hsnList.add(createHsn("6111", 5, "Babies garments knitted", "Textiles"));
        hsnList.add(createHsn("6112", 5, "Track suits knitted", "Textiles"));
        hsnList.add(createHsn("6113", 5, "Garments rubber/plastic coated", "Textiles"));
        hsnList.add(createHsn("6114", 5, "Other knitted garments", "Textiles"));
        hsnList.add(createHsn("6115", 5, "Hosiery", "Textiles"));
        hsnList.add(createHsn("6116", 5, "Gloves, mittens knitted", "Textiles"));
        hsnList.add(createHsn("6117", 5, "Made-up clothing accessories", "Textiles"));
        hsnList.add(createHsn("6203", 5, "Men suits not knitted", "Textiles"));
        hsnList.add(createHsn("6204", 5, "Women suits not knitted", "Textiles"));
        hsnList.add(createHsn("6205", 5, "Men shirts not knitted", "Textiles"));
        hsnList.add(createHsn("6206", 5, "Women blouses", "Textiles"));
        hsnList.add(createHsn("6301", 5, "Blankets", "Textiles"));
        hsnList.add(createHsn("6302", 5, "Bed linen", "Textiles"));
        hsnList.add(createHsn("6303", 5, "Curtains", "Textiles"));
        hsnList.add(createHsn("6304", 5, "Other furnishing articles", "Textiles"));
        hsnList.add(createHsn("6305", 5, "Sacks bags for packing", "Textiles"));
        hsnList.add(createHsn("6306", 5, "Tarpaulins, tents", "Textiles"));
        hsnList.add(createHsn("6307", 5, "Other made-up textiles", "Textiles"));
        hsnList.add(createHsn("6308", 5, "Sets of woven fabric", "Textiles"));
        hsnList.add(createHsn("6309", 5, "Worn clothing", "Textiles"));
        hsnList.add(createHsn("6310", 5, "Used rags", "Textiles"));

        // Footwear & Headgear
        hsnList.add(createHsn("6401", 18, "Waterproof footwear", "Footwear"));
        hsnList.add(createHsn("6402", 18, "Rubber/plastic footwear", "Footwear"));
        hsnList.add(createHsn("6403", 18, "Leather footwear", "Footwear"));
        hsnList.add(createHsn("6404", 18, "Textile footwear", "Footwear"));
        hsnList.add(createHsn("6405", 18, "Other footwear", "Footwear"));
        hsnList.add(createHsn("6505", 5, "Hats and headgear", "Accessories"));

        // Construction Materials
        hsnList.add(createHsn("6810", 28, "Articles of cement (+cess)", "Construction"));
        hsnList.add(createHsn("6907", 28, "Ceramic flags, tiles (+cess)", "Construction"));
        hsnList.add(createHsn("6912", 18, "Ceramic tableware", "Ceramics"));

        // Glass
        hsnList.add(createHsn("7005", 18, "Float glass", "Glass"));
        hsnList.add(createHsn("7009", 18, "Glass mirrors", "Glass"));
        hsnList.add(createHsn("7010", 18, "Glass ampoules, containers", "Glass"));
        hsnList.add(createHsn("7013", 18, "Glassware for table/kitchen", "Glass"));
        hsnList.add(createHsn("7018", 18, "Glass beads, imitation jewellery", "Glass"));

        // Precious Metals & Jewellery
        hsnList.add(createHsn("7108", 3, "Gold (precious metal)", "Jewellery"));
        hsnList.add(createHsn("7113", 3, "Articles of jewellery", "Jewellery"));
        hsnList.add(createHsn("7117", 3, "Imitation jewellery", "Jewellery"));

        // Iron & Steel
        hsnList.add(createHsn("7208", 18, "Flat-rolled iron/steel", "Steel"));
        hsnList.add(createHsn("7210", 18, "Plated/coated flat steel", "Steel"));
        hsnList.add(createHsn("7213", 18, "Bars and rods iron", "Steel"));
        hsnList.add(createHsn("7218", 18, "Stainless steel", "Steel"));
        hsnList.add(createHsn("7219", 18, "Flat-rolled stainless", "Steel"));
        hsnList.add(createHsn("7220", 18, "Narrow stainless strip", "Steel"));
        hsnList.add(createHsn("7222", 18, "Other bars stainless", "Steel"));
        hsnList.add(createHsn("7223", 18, "Wire of stainless steel", "Steel"));

        // Iron/Steel Articles
        hsnList.add(createHsn("7301", 18, "Sheet piling", "Steel"));
        hsnList.add(createHsn("7302", 18, "Railway track material", "Steel"));
        hsnList.add(createHsn("7303", 18, "Tubes, pipes cast iron", "Steel"));
        hsnList.add(createHsn("7304", 18, "Tubes, pipes seamless steel", "Steel"));
        hsnList.add(createHsn("7305", 18, "Tubes, pipes welded 215mm+", "Steel"));
        hsnList.add(createHsn("7306", 18, "Other tubes, pipes steel", "Steel"));
        hsnList.add(createHsn("7307", 18, "Tube/pipe fittings", "Steel"));
        hsnList.add(createHsn("7308", 18, "Structures, parts of iron/steel", "Steel"));
        hsnList.add(createHsn("7309", 18, "Tanks, vats 300l+", "Steel"));
        hsnList.add(createHsn("7310", 18, "Tanks, drums <300l", "Steel"));
        hsnList.add(createHsn("7311", 18, "LPG containers", "Steel"));
        hsnList.add(createHsn("7312", 18, "Stranded wire, ropes", "Steel"));
        hsnList.add(createHsn("7313", 18, "Barbed wire", "Steel"));
        hsnList.add(createHsn("7314", 18, "Cloth, grill of iron wire", "Steel"));
        hsnList.add(createHsn("7315", 18, "Chain and parts", "Steel"));
        hsnList.add(createHsn("7316", 18, "Anchors, grapnels", "Steel"));
        hsnList.add(createHsn("7317", 18, "Nails, staples", "Steel"));
        hsnList.add(createHsn("7318", 18, "Screws, bolts, nuts", "Steel"));
        hsnList.add(createHsn("7319", 18, "Sewing needles, pins", "Steel"));
        hsnList.add(createHsn("7320", 18, "Springs of iron/steel", "Steel"));
        hsnList.add(createHsn("7321", 18, "Stoves, ranges, non-electric", "Steel"));
        hsnList.add(createHsn("7322", 18, "Radiators, air heaters", "Steel"));
        hsnList.add(createHsn("7323", 18, "Table, kitchen, other household steel", "Steel"));
        hsnList.add(createHsn("7324", 18, "Sanitary ware steel", "Steel"));
        hsnList.add(createHsn("7325", 18, "Other cast articles iron/steel", "Steel"));
        hsnList.add(createHsn("7326", 18, "Other articles iron/steel", "Steel"));

        // Copper & Aluminium
        hsnList.add(createHsn("7418", 18, "Table, kitchen copper", "Copper"));
        hsnList.add(createHsn("7419", 18, "Other articles copper", "Copper"));
        hsnList.add(createHsn("7615", 18, "Table, kitchen aluminium", "Aluminium"));
        hsnList.add(createHsn("7616", 18, "Other articles aluminium", "Aluminium"));

        // Tools
        hsnList.add(createHsn("8201", 18, "Hand tools", "Tools"));
        hsnList.add(createHsn("8205", 18, "Hand tools misc", "Tools"));
        hsnList.add(createHsn("8207", 18, "Interchangeable tools", "Tools"));
        hsnList.add(createHsn("8211", 18, "Knives, blades", "Tools"));
        hsnList.add(createHsn("8212", 18, "Razors", "Tools"));
        hsnList.add(createHsn("8213", 18, "Scissors", "Tools"));
        hsnList.add(createHsn("8214", 18, "Other cutlery", "Tools"));
        hsnList.add(createHsn("8215", 18, "Spoons, forks", "Tools"));

        // Metal Fittings
        hsnList.add(createHsn("8301", 18, "Padlocks, locks", "Hardware"));
        hsnList.add(createHsn("8302", 18, "Mountings, fittings", "Hardware"));
        hsnList.add(createHsn("8303", 18, "Safes, strongboxes", "Hardware"));
        hsnList.add(createHsn("8304", 18, "Filing cabinets", "Hardware"));
        hsnList.add(createHsn("8305", 18, "Loose-leaf binders", "Hardware"));
        hsnList.add(createHsn("8306", 18, "Bells, ornaments metal", "Hardware"));
        hsnList.add(createHsn("8307", 18, "Flexible tubing metal", "Hardware"));
        hsnList.add(createHsn("8308", 18, "Clasps, buckles", "Hardware"));
        hsnList.add(createHsn("8309", 18, "Stoppers, caps", "Hardware"));
        hsnList.add(createHsn("8310", 18, "Sign plates", "Hardware"));
        hsnList.add(createHsn("8311", 18, "Wire for welding", "Hardware"));

        // Machinery
        hsnList.add(createHsn("8407", 28, "Aircraft engines (+cess)", "Machinery"));
        hsnList.add(createHsn("8408", 28, "Compression-ignition engines", "Machinery"));
        hsnList.add(createHsn("8409", 28, "Parts for engines", "Machinery"));
        hsnList.add(createHsn("8413", 18, "Pumps for liquids", "Machinery"));
        hsnList.add(createHsn("8414", 18, "Fans, air pumps", "Machinery"));
        hsnList.add(createHsn("8415", 18, "Air conditioning", "Machinery"));
        hsnList.add(createHsn("8418", 18, "Refrigerators, freezers", "Machinery"));
        hsnList.add(createHsn("8419", 18, "Industrial heating/cooling", "Machinery"));
        hsnList.add(createHsn("8421", 18, "Filters, centrifuges", "Machinery"));
        hsnList.add(createHsn("8422", 18, "Dish washing machines", "Machinery"));
        hsnList.add(createHsn("8423", 18, "Weighing machinery", "Machinery"));
        hsnList.add(createHsn("8424", 18, "Spraying appliances", "Machinery"));
        hsnList.add(createHsn("8425", 18, "Pulley tackle, hoists", "Machinery"));
        hsnList.add(createHsn("8426", 18, "Cranes", "Machinery"));
        hsnList.add(createHsn("8427", 18, "Fork-lift trucks", "Machinery"));
        hsnList.add(createHsn("8428", 18, "Lifts, escalators", "Machinery"));
        hsnList.add(createHsn("8429", 28, "Bulldozers, excavators", "Machinery"));
        hsnList.add(createHsn("8430", 18, "Other moving machinery", "Machinery"));
        hsnList.add(createHsn("8431", 18, "Parts for 8425-8430", "Machinery"));
        hsnList.add(createHsn("8432", 12, "Agricultural machinery", "Machinery"));
        hsnList.add(createHsn("8433", 12, "Harvesting machinery", "Machinery"));
        hsnList.add(createHsn("8434", 12, "Milking machines", "Machinery"));
        hsnList.add(createHsn("8435", 12, "Presses for wine/cider", "Machinery"));
        hsnList.add(createHsn("8436", 12, "Agri equipment", "Machinery"));
        hsnList.add(createHsn("8437", 12, "Seed processing", "Machinery"));
        hsnList.add(createHsn("8438", 18, "Food industry machinery", "Machinery"));
        hsnList.add(createHsn("8439", 18, "Paper pulp machinery", "Machinery"));
        hsnList.add(createHsn("8440", 18, "Bookbinding machinery", "Machinery"));
        hsnList.add(createHsn("8441", 18, "Paper cutting", "Machinery"));
        hsnList.add(createHsn("8442", 18, "Print machinery", "Machinery"));
        hsnList.add(createHsn("8443", 18, "Printing machinery", "Machinery"));
        hsnList.add(createHsn("8444", 18, "Knitting machines", "Machinery"));
        hsnList.add(createHsn("8445", 18, "Weaving machines", "Machinery"));
        hsnList.add(createHsn("8446", 18, "Weaving loom", "Machinery"));
        hsnList.add(createHsn("8447", 18, "Knitting, stitch machines", "Machinery"));
        hsnList.add(createHsn("8448", 18, "Auxiliary textile machines", "Machinery"));
        hsnList.add(createHsn("8449", 18, "Machines for felt", "Machinery"));
        hsnList.add(createHsn("8450", 18, "Washing machines household", "Machinery"));
        hsnList.add(createHsn("8451", 18, "Dry-cleaning machines", "Machinery"));
        hsnList.add(createHsn("8452", 18, "Sewing machines", "Machinery"));
        hsnList.add(createHsn("8453", 18, "Leather machinery", "Machinery"));
        hsnList.add(createHsn("8454", 18, "Converters, ladles", "Machinery"));
        hsnList.add(createHsn("8455", 18, "Metal rolling mills", "Machinery"));
        hsnList.add(createHsn("8456", 18, "Machine tools laser", "Machinery"));
        hsnList.add(createHsn("8457", 18, "Machining centres", "Machinery"));
        hsnList.add(createHsn("8458", 18, "Lathes", "Machinery"));
        hsnList.add(createHsn("8459", 18, "Boring, milling machines", "Machinery"));
        hsnList.add(createHsn("8460", 18, "Finishing metal machines", "Machinery"));
        hsnList.add(createHsn("8461", 18, "Shaping, slotting", "Machinery"));
        hsnList.add(createHsn("8462", 18, "Forging machines", "Machinery"));
        hsnList.add(createHsn("8463", 18, "Other machine tools", "Machinery"));
        hsnList.add(createHsn("8464", 18, "Stone working machines", "Machinery"));
        hsnList.add(createHsn("8465", 18, "Wood working machines", "Machinery"));
        hsnList.add(createHsn("8466", 18, "Parts for 8456-8465", "Machinery"));
        hsnList.add(createHsn("8467", 18, "Hand-held power tools", "Machinery"));
        hsnList.add(createHsn("8468", 18, "Soldering, welding machines", "Machinery"));

        // Office Equipment
        hsnList.add(createHsn("8470", 18, "Calculators, cash registers", "Electronics"));
        hsnList.add(createHsn("8471", 18, "Computers, laptops", "Electronics"));
        hsnList.add(createHsn("8472", 18, "Office machines NEC", "Electronics"));
        hsnList.add(createHsn("8473", 18, "Parts for 8470-8472", "Electronics"));
        hsnList.add(createHsn("8479", 18, "Machines with individual functions", "Machinery"));
        hsnList.add(createHsn("8480", 18, "Moulding boxes", "Machinery"));
        hsnList.add(createHsn("8481", 18, "Taps, cocks, valves", "Machinery"));
        hsnList.add(createHsn("8482", 18, "Ball bearings", "Machinery"));
        hsnList.add(createHsn("8483", 18, "Transmission shafts", "Machinery"));
        hsnList.add(createHsn("8484", 18, "Gaskets", "Machinery"));
        hsnList.add(createHsn("8485", 18, "Machine parts moulded", "Machinery"));
        hsnList.add(createHsn("8486", 18, "Semiconductor manufacturing", "Electronics"));

        // Electrical Equipment
        hsnList.add(createHsn("8504", 18, "Electrical transformers", "Electrical"));
        hsnList.add(createHsn("8505", 18, "Electro-magnets", "Electrical"));
        hsnList.add(createHsn("8506", 28, "Primary cells, batteries", "Electrical"));
        hsnList.add(createHsn("8507", 18, "Electric accumulators", "Electrical"));
        hsnList.add(createHsn("8508", 18, "Vacuum cleaners", "Electrical"));
        hsnList.add(createHsn("8509", 18, "Electro-mechanical domestic", "Electrical"));
        hsnList.add(createHsn("8510", 18, "Shavers, hair clippers", "Electrical"));
        hsnList.add(createHsn("8511", 28, "Ignition equipment auto", "Electrical"));
        hsnList.add(createHsn("8512", 28, "Lighting for vehicles", "Electrical"));
        hsnList.add(createHsn("8513", 18, "Portable electric lamps", "Electrical"));
        hsnList.add(createHsn("8514", 18, "Industrial furnaces", "Electrical"));
        hsnList.add(createHsn("8515", 18, "Electric soldering", "Electrical"));
        hsnList.add(createHsn("8516", 18, "Electric heating appliances", "Electrical"));
        hsnList.add(createHsn("8517", 18, "Telephone, smartphones", "Electronics"));
        hsnList.add(createHsn("8518", 18, "Microphones, loudspeakers", "Electronics"));
        hsnList.add(createHsn("8519", 18, "Sound recording players", "Electronics"));
        hsnList.add(createHsn("8521", 18, "Video recording", "Electronics"));
        hsnList.add(createHsn("8523", 18, "Discs, tapes, media", "Electronics"));
        hsnList.add(createHsn("8524", 18, "Flat panel displays", "Electronics"));
        hsnList.add(createHsn("8525", 18, "Transmission apparatus", "Electronics"));
        hsnList.add(createHsn("8526", 18, "Radar, radio navigational", "Electronics"));
        hsnList.add(createHsn("8527", 18, "Radio receivers", "Electronics"));
        hsnList.add(createHsn("8528", 28, "Monitors, televisions (+cess)", "Electronics"));
        hsnList.add(createHsn("8529", 18, "Parts for 8525-8528", "Electronics"));
        hsnList.add(createHsn("8530", 18, "Electrical signalling", "Electrical"));
        hsnList.add(createHsn("8531", 18, "Electric sound/visual signalling", "Electrical"));
        hsnList.add(createHsn("8532", 18, "Capacitors", "Electrical"));
        hsnList.add(createHsn("8533", 18, "Electrical resistors", "Electrical"));
        hsnList.add(createHsn("8534", 18, "Printed circuits", "Electrical"));
        hsnList.add(createHsn("8535", 18, "Switchgear >1kV", "Electrical"));
        hsnList.add(createHsn("8536", 18, "Electrical apparatus <1kV", "Electrical"));
        hsnList.add(createHsn("8537", 18, "Control panels", "Electrical"));
        hsnList.add(createHsn("8538", 18, "Parts for 8535-8537", "Electrical"));
        hsnList.add(createHsn("8539", 18, "LED lamps, tubes", "Electrical"));
        hsnList.add(createHsn("8540", 18, "Thermionic tubes", "Electrical"));
        hsnList.add(createHsn("8541", 18, "Semiconductor devices", "Electrical"));
        hsnList.add(createHsn("8542", 18, "Electronic integrated circuits", "Electrical"));
        hsnList.add(createHsn("8543", 18, "Electrical machines NEC", "Electrical"));
        hsnList.add(createHsn("8544", 18, "Insulated wire, cable", "Electrical"));
        hsnList.add(createHsn("8545", 18, "Carbon electrodes", "Electrical"));
        hsnList.add(createHsn("8546", 18, "Electrical insulators", "Electrical"));
        hsnList.add(createHsn("8547", 18, "Insulating fittings", "Electrical"));
        hsnList.add(createHsn("8548", 18, "Electrical parts waste", "Electrical"));

        // Railway
        hsnList.add(createHsn("8601", 5, "Rail locomotives", "Railway"));
        hsnList.add(createHsn("8602", 5, "Rail locomotives diesel", "Railway"));
        hsnList.add(createHsn("8603", 5, "Self-propelled rail coaches", "Railway"));
        hsnList.add(createHsn("8604", 5, "Railway maintenance", "Railway"));
        hsnList.add(createHsn("8605", 5, "Railway coaches not self-propelled", "Railway"));
        hsnList.add(createHsn("8606", 5, "Railway goods vans", "Railway"));
        hsnList.add(createHsn("8607", 5, "Parts of railway", "Railway"));
        hsnList.add(createHsn("8608", 5, "Railway fixtures", "Railway"));
        hsnList.add(createHsn("8609", 5, "Containers rail/road", "Railway"));

        // Vehicles
        hsnList.add(createHsn("8701", 28, "Tractors (+cess)", "Vehicles"));
        hsnList.add(createHsn("8702", 28, "Buses (+cess)", "Vehicles"));
        hsnList.add(createHsn("8703", 28, "Motor cars (+cess)", "Vehicles"));
        hsnList.add(createHsn("8704", 28, "Motor vehicles goods (+cess)", "Vehicles"));
        hsnList.add(createHsn("8705", 28, "Special purpose motor (+cess)", "Vehicles"));
        hsnList.add(createHsn("8706", 28, "Chassis with engine", "Vehicles"));
        hsnList.add(createHsn("8707", 28, "Bodies for motor vehicles", "Vehicles"));
        hsnList.add(createHsn("8708", 28, "Parts for 8701-8705", "Vehicles"));
        hsnList.add(createHsn("8709", 18, "Works trucks", "Vehicles"));
        hsnList.add(createHsn("8710", 28, "Tanks, armoured (+cess)", "Vehicles"));
        hsnList.add(createHsn("8711", 28, "Motorcycles (+cess)", "Vehicles"));
        hsnList.add(createHsn("8712", 12, "Bicycles", "Vehicles"));
        hsnList.add(createHsn("8713", 5, "Invalid carriages", "Vehicles"));
        hsnList.add(createHsn("8714", 28, "Parts for cycles", "Vehicles"));
        hsnList.add(createHsn("8715", 18, "Baby carriages", "Vehicles"));
        hsnList.add(createHsn("8716", 18, "Trailers, semi-trailers", "Vehicles"));

        // Aircraft
        hsnList.add(createHsn("8801", 5, "Balloons, dirigibles", "Aircraft"));
        hsnList.add(createHsn("8802", 5, "Aircraft (+cess)", "Aircraft"));
        hsnList.add(createHsn("8804", 5, "Parachutes", "Aircraft"));
        hsnList.add(createHsn("8805", 5, "Aircraft launching", "Aircraft"));
        hsnList.add(createHsn("8806", 5, "Parts of aircraft", "Aircraft"));
        hsnList.add(createHsn("8807", 5, "Parts of 8801-8803", "Aircraft"));

        // Ships
        hsnList.add(createHsn("8901", 5, "Cruise ships, ferries", "Ships"));
        hsnList.add(createHsn("8902", 5, "Fishing vessels", "Ships"));
        hsnList.add(createHsn("8903", 18, "Yachts, boats pleasure", "Ships"));
        hsnList.add(createHsn("8904", 5, "Tugs, pusher craft", "Ships"));
        hsnList.add(createHsn("8905", 5, "Light-vessels", "Ships"));
        hsnList.add(createHsn("8906", 5, "Other vessels", "Ships"));
        hsnList.add(createHsn("8907", 5, "Floating structures", "Ships"));
        hsnList.add(createHsn("8908", 5, "Vessels scrap", "Ships"));

        // Optical & Medical
        hsnList.add(createHsn("9001", 12, "Optical fibres", "Optical"));
        hsnList.add(createHsn("9002", 12, "Optical elements mounted", "Optical"));
        hsnList.add(createHsn("9003", 12, "Frames for spectacles", "Optical"));
        hsnList.add(createHsn("9004", 12, "Spectacles, goggles", "Optical"));
        hsnList.add(createHsn("9005", 18, "Binoculars, telescopes", "Optical"));
        hsnList.add(createHsn("9006", 18, "Cameras photographic", "Optical"));
        hsnList.add(createHsn("9007", 18, "Cinematographic cameras", "Optical"));
        hsnList.add(createHsn("9008", 18, "Image projectors", "Optical"));
        hsnList.add(createHsn("9010", 18, "Photo labs apparatus", "Optical"));
        hsnList.add(createHsn("9011", 12, "Microscopes optical", "Optical"));
        hsnList.add(createHsn("9013", 18, "Lasers other than laser diodes", "Optical"));
        hsnList.add(createHsn("9014", 12, "Compasses, navigational", "Optical"));
        hsnList.add(createHsn("9015", 18, "Surveying instruments", "Optical"));
        hsnList.add(createHsn("9016", 18, "Balances sensitive", "Optical"));
        hsnList.add(createHsn("9017", 18, "Drawing instruments", "Optical"));
        hsnList.add(createHsn("9018", 12, "Medical, surgical instruments", "Medical"));
        hsnList.add(createHsn("9019", 12, "Mechano-therapy appliances", "Medical"));
        hsnList.add(createHsn("9020", 12, "Breathing appliances", "Medical"));
        hsnList.add(createHsn("9021", 12, "Orthopaedic appliances", "Medical"));
        hsnList.add(createHsn("9022", 12, "X-ray apparatus", "Medical"));
        hsnList.add(createHsn("9023", 18, "Instruments for physical analysis", "Medical"));
        hsnList.add(createHsn("9024", 18, "Machines for testing hardness", "Medical"));
        hsnList.add(createHsn("9025", 18, "Hydrometers, thermometers", "Medical"));
        hsnList.add(createHsn("9026", 18, "Flow, level, pressure meters", "Medical"));
        hsnList.add(createHsn("9027", 18, "Gas, smoke analysis", "Medical"));
        hsnList.add(createHsn("9028", 18, "Gas, liquid, electricity meters", "Medical"));
        hsnList.add(createHsn("9029", 18, "Revolution counters", "Medical"));
        hsnList.add(createHsn("9030", 18, "Oscilloscopes", "Medical"));
        hsnList.add(createHsn("9031", 18, "Measuring instruments NEC", "Medical"));
        hsnList.add(createHsn("9032", 18, "Automatic regulating instruments", "Medical"));
        hsnList.add(createHsn("9033", 18, "Parts for 9029-9032", "Medical"));

        // Clocks & Watches
        hsnList.add(createHsn("9101", 18, "Wrist-watches precious metal", "Watches"));
        hsnList.add(createHsn("9102", 18, "Wrist-watches other", "Watches"));
        hsnList.add(createHsn("9103", 18, "Clocks electric", "Watches"));
        hsnList.add(createHsn("9104", 18, "Instrument panel clocks", "Watches"));
        hsnList.add(createHsn("9105", 18, "Other clocks", "Watches"));
        hsnList.add(createHsn("9106", 18, "Time registers", "Watches"));
        hsnList.add(createHsn("9107", 18, "Time switches", "Watches"));
        hsnList.add(createHsn("9108", 18, "Watch movements", "Watches"));
        hsnList.add(createHsn("9109", 18, "Complete watch movements", "Watches"));
        hsnList.add(createHsn("9110", 18, "Incomplete watch movements", "Watches"));
        hsnList.add(createHsn("9111", 18, "Watch cases", "Watches"));
        hsnList.add(createHsn("9112", 18, "Clock/watch cases", "Watches"));
        hsnList.add(createHsn("9113", 18, "Watch straps", "Watches"));
        hsnList.add(createHsn("9114", 18, "Other clock parts", "Watches"));

        // Musical Instruments
        hsnList.add(createHsn("9201", 18, "Pianos", "Musical"));
        hsnList.add(createHsn("9202", 18, "String musical instruments", "Musical"));
        hsnList.add(createHsn("9205", 18, "Wind musical instruments", "Musical"));
        hsnList.add(createHsn("9206", 18, "Percussion instruments", "Musical"));
        hsnList.add(createHsn("9207", 18, "Keyboard instruments electric", "Musical"));
        hsnList.add(createHsn("9208", 18, "Musical boxes", "Musical"));
        hsnList.add(createHsn("9209", 18, "Parts of musical instruments", "Musical"));

        // Arms & Ammunition
        hsnList.add(createHsn("9301", 28, "Military arms (+cess)", "Arms"));
        hsnList.add(createHsn("9302", 28, "Revolvers, pistols", "Arms"));
        hsnList.add(createHsn("9303", 28, "Other firearms", "Arms"));
        hsnList.add(createHsn("9304", 18, "Spring, air guns", "Arms"));
        hsnList.add(createHsn("9305", 18, "Parts of arms", "Arms"));
        hsnList.add(createHsn("9306", 18, "Bombs, grenades", "Arms"));
        hsnList.add(createHsn("9307", 18, "Swords, blades", "Arms"));

        // Furniture
        hsnList.add(createHsn("9401", 18, "Seats", "Furniture"));
        hsnList.add(createHsn("9402", 18, "Medical, surgical furniture", "Furniture"));
        hsnList.add(createHsn("9403", 18, "Other furniture", "Furniture"));
        hsnList.add(createHsn("9404", 12, "Mattress supports", "Furniture"));
        hsnList.add(createHsn("9405", 18, "Lamps, lighting fittings", "Furniture"));
        hsnList.add(createHsn("9406", 18, "Prefabricated buildings", "Construction"));

        // Toys & Sports
        hsnList.add(createHsn("9503", 12, "Toys, models", "Toys"));
        hsnList.add(createHsn("9504", 28, "Video game consoles", "Toys"));
        hsnList.add(createHsn("9505", 18, "Festive articles", "Toys"));
        hsnList.add(createHsn("9506", 12, "Sports equipment", "Sports"));
        hsnList.add(createHsn("9507", 12, "Fishing tackle", "Sports"));
        hsnList.add(createHsn("9508", 18, "Roundabouts, fairground", "Toys"));

        // Miscellaneous
        hsnList.add(createHsn("9601", 18, "Worked ivory, bone", "Misc"));
        hsnList.add(createHsn("9602", 18, "Vegetable carving", "Misc"));
        hsnList.add(createHsn("9603", 18, "Brooms, brushes", "Misc"));
        hsnList.add(createHsn("9604", 18, "Hand sieves", "Misc"));
        hsnList.add(createHsn("9605", 18, "Travel sets toilet", "Misc"));
        hsnList.add(createHsn("9606", 18, "Buttons, press-fasteners", "Misc"));
        hsnList.add(createHsn("9607", 18, "Slide fasteners", "Misc"));
        hsnList.add(createHsn("9608", 18, "Pens, markers", "Misc"));
        hsnList.add(createHsn("9609", 18, "Pencils, crayons", "Misc"));
        hsnList.add(createHsn("9610", 18, "Slates, boards", "Misc"));
        hsnList.add(createHsn("9611", 18, "Date, sealing stamps", "Misc"));
        hsnList.add(createHsn("9612", 18, "Ribbons inked", "Misc"));
        hsnList.add(createHsn("9613", 18, "Cigarette lighters", "Misc"));
        hsnList.add(createHsn("9614", 18, "Smoking pipes", "Misc"));
        hsnList.add(createHsn("9615", 18, "Combs, hair-slides", "Misc"));
        hsnList.add(createHsn("9616", 18, "Sprays, powder puffs", "Misc"));
        hsnList.add(createHsn("9617", 18, "Vacuum flasks", "Misc"));
        hsnList.add(createHsn("9618", 18, "Tailors dummies", "Misc"));
        hsnList.add(createHsn("9619", 12, "Sanitary towels, diapers", "Misc"));
        hsnList.add(createHsn("9620", 18, "Monopods, tripods", "Misc"));

        // Art & Antiques
        hsnList.add(createHsn("9701", 12, "Paintings, drawings", "Art"));
        hsnList.add(createHsn("9702", 12, "Original engravings", "Art"));
        hsnList.add(createHsn("9703", 12, "Original sculptures", "Art"));
        hsnList.add(createHsn("9704", 12, "Postage stamps", "Art"));
        hsnList.add(createHsn("9705", 12, "Collections, specimens", "Art"));
        hsnList.add(createHsn("9706", 12, "Antiques >100 years", "Art"));

        // Special Cases
        hsnList.add(createHsn("9801", 0, "Project imports", "Special"));
        hsnList.add(createHsn("9802", 0, "Laboratory chemicals", "Special"));
        hsnList.add(createHsn("9803", 0, "Passenger baggage", "Special"));
        hsnList.add(createHsn("9804", 0, "Personal effects", "Special"));
        hsnList.add(createHsn("9805", 0, "Tourist purchases", "Special"));

        // SAC - Services
        hsnList.add(createHsn("9961", 5, "SAC - Services by restaurants", "Services"));
        hsnList.add(createHsn("9962", 5, "SAC - Accommodation services", "Services"));
        hsnList.add(createHsn("9963", 18, "SAC - Restaurant with bar", "Services"));
        hsnList.add(createHsn("9965", 18, "SAC - Goods transport agency", "Services"));
        hsnList.add(createHsn("9966", 18, "SAC - Rental services", "Services"));
        hsnList.add(createHsn("9967", 18, "SAC - Support services", "Services"));
        hsnList.add(createHsn("9968", 18, "SAC - Maintenance services", "Services"));
        hsnList.add(createHsn("9969", 18, "SAC - Other services", "Services"));
        hsnList.add(createHsn("9971", 18, "SAC - Financial services", "Services"));
        hsnList.add(createHsn("9972", 18, "SAC - Real estate services", "Services"));
        hsnList.add(createHsn("9973", 18, "SAC - Leasing services", "Services"));
        hsnList.add(createHsn("9983", 18, "SAC - IT consulting", "Services"));
        hsnList.add(createHsn("9984", 18, "SAC - Telecom services", "Services"));
        hsnList.add(createHsn("9985", 18, "SAC - Support IT", "Services"));
        hsnList.add(createHsn("9986", 18, "SAC - Professional services", "Services"));
        hsnList.add(createHsn("9987", 18, "SAC - Maintenance IT", "Services"));
        hsnList.add(createHsn("9988", 18, "SAC - Other IT", "Services"));
        hsnList.add(createHsn("9989", 18, "SAC - Other miscellaneous", "Services"));
        hsnList.add(createHsn("9991", 18, "SAC - Public administration", "Services"));
        hsnList.add(createHsn("9992", 18, "SAC - Education services", "Services"));
        hsnList.add(createHsn("9993", 18, "SAC - Human health", "Services"));
        hsnList.add(createHsn("9994", 18, "SAC - Sewage, sanitation", "Services"));
        hsnList.add(createHsn("9995", 18, "SAC - Membership org", "Services"));
        hsnList.add(createHsn("9996", 18, "SAC - Recreational", "Services"));
        hsnList.add(createHsn("9997", 18, "SAC - Personal services", "Services"));
        hsnList.add(createHsn("9998", 18, "SAC - Domestic services", "Services"));
        hsnList.add(createHsn("9999", 18, "SAC - Services NEC", "Services"));

        hsnRepo.saveAll(hsnList);
        System.out.println("HSN Master initialized with " + hsnList.size() + " records");
    }

    private HsnMaster createHsn(String code, double gstRate, String description, String category) {
        HsnMaster hsn = new HsnMaster();
        hsn.setHsnCode(code);
        hsn.setGstRate(gstRate);
        hsn.setDescription(description);
        hsn.setCategory(category);

        // Generate keywords for search
        String[] keywords = description.toLowerCase()
            .replace(",", " ")
            .replace("(", " ")
            .replace(")", " ")
            .replace("/", " ")
            .split("\\s+");
        hsn.setKeywords(keywords);

        return hsn;
    }
}
