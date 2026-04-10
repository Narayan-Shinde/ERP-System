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

        // ============================================
        // COMPLETE 8-DIGIT HSN CODES FOR ALL CHAPTERS 1-98
        // ============================================
        
        // CHAPTER 1: LIVE ANIMALS
        hsnList.add(createHsn("01012100", 0, "Horses - Pure-bred breeding animals", "Live Animals"));
        hsnList.add(createHsn("01012900", 0, "Horses - Other", "Live Animals"));
        hsnList.add(createHsn("01013000", 0, "Asses", "Live Animals"));
        hsnList.add(createHsn("01019000", 0, "Mules and hinnies", "Live Animals"));
        hsnList.add(createHsn("01022100", 0, "Cattle - Pure-bred breeding animals", "Live Animals"));
        hsnList.add(createHsn("01022900", 0, "Cattle - Other", "Live Animals"));
        hsnList.add(createHsn("01023100", 0, "Buffalo - Pure-bred breeding animals", "Live Animals"));
        hsnList.add(createHsn("01023900", 0, "Buffalo - Other", "Live Animals"));
        hsnList.add(createHsn("01029000", 0, "Other bovine animals", "Live Animals"));
        hsnList.add(createHsn("01031000", 0, "Swine - Pure-bred breeding animals", "Live Animals"));
        hsnList.add(createHsn("01039100", 0, "Swine - Weighing <50kg", "Live Animals"));
        hsnList.add(createHsn("01039200", 0, "Swine - Weighing >=50kg", "Live Animals"));
        hsnList.add(createHsn("01041000", 0, "Sheep - Pure-bred breeding", "Live Animals"));
        hsnList.add(createHsn("01042000", 0, "Sheep - Other", "Live Animals"));
        hsnList.add(createHsn("01043000", 0, "Goats - Pure-bred breeding", "Live Animals"));
        hsnList.add(createHsn("01044000", 0, "Goats - Other", "Live Animals"));
        hsnList.add(createHsn("01051100", 0, "Chickens - <=185g", "Live Animals"));
        hsnList.add(createHsn("01051200", 0, "Turkeys - <=185g", "Live Animals"));
        hsnList.add(createHsn("01051300", 0, "Ducks - <=185g", "Live Animals"));
        hsnList.add(createHsn("01051400", 0, "Geese - <=185g", "Live Animals"));
        hsnList.add(createHsn("01051500", 0, "Guinea fowls - <=185g", "Live Animals"));
        hsnList.add(createHsn("01059400", 0, "Chickens - >185g", "Live Animals"));
        hsnList.add(createHsn("01059900", 0, "Other poultry - >185g", "Live Animals"));
        hsnList.add(createHsn("01061100", 0, "Primates", "Live Animals"));
        hsnList.add(createHsn("01061200", 0, "Whales, dolphins", "Live Animals"));
        hsnList.add(createHsn("01061300", 0, "Camels", "Live Animals"));
        hsnList.add(createHsn("01061400", 0, "Rabbits, hares", "Live Animals"));
        hsnList.add(createHsn("01061900", 0, "Other mammals", "Live Animals"));
        hsnList.add(createHsn("01062000", 0, "Reptiles", "Live Animals"));
        hsnList.add(createHsn("01063100", 0, "Birds of prey", "Live Animals"));
        hsnList.add(createHsn("01063200", 0, "Psittaciformes", "Live Animals"));
        hsnList.add(createHsn("01063300", 0, "Ostriches, emus", "Live Animals"));
        hsnList.add(createHsn("01063900", 0, "Other birds", "Live Animals"));
        hsnList.add(createHsn("01064100", 0, "Bees", "Live Animals"));
        hsnList.add(createHsn("01064900", 0, "Other insects", "Live Animals"));
        hsnList.add(createHsn("01069000", 0, "Other live animals", "Live Animals"));
        
        // CHAPTER 2: MEAT AND EDIBLE MEAT OFFAL
        hsnList.add(createHsn("02011000", 0, "Bovine meat - Carcasses/half-carcasses - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02012000", 0, "Bovine meat - Other cuts with bone - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02013000", 0, "Bovine meat - Boneless - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02021000", 0, "Bovine meat - Carcasses/half-carcasses - Frozen", "Meat"));
        hsnList.add(createHsn("02022000", 0, "Bovine meat - Other cuts with bone - Frozen", "Meat"));
        hsnList.add(createHsn("02023000", 0, "Bovine meat - Boneless - Frozen", "Meat"));
        hsnList.add(createHsn("02031100", 0, "Swine meat - Carcasses/half-carcasses - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02031200", 0, "Swine meat - Hams, shoulders - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02031900", 0, "Swine meat - Other - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02032100", 0, "Swine meat - Carcasses/half-carcasses - Frozen", "Meat"));
        hsnList.add(createHsn("02032200", 0, "Swine meat - Hams, shoulders - Frozen", "Meat"));
        hsnList.add(createHsn("02032900", 0, "Swine meat - Other - Frozen", "Meat"));
        hsnList.add(createHsn("02041000", 0, "Sheep meat - Carcasses/half-carcasses - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02042100", 0, "Sheep meat - Carcasses/half-carcasses - Frozen", "Meat"));
        hsnList.add(createHsn("02042200", 0, "Sheep meat - Other cuts with bone - Frozen", "Meat"));
        hsnList.add(createHsn("02042300", 0, "Sheep meat - Boneless - Frozen", "Meat"));
        hsnList.add(createHsn("02043000", 0, "Goat meat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02044100", 0, "Goat meat - Frozen", "Meat"));
        hsnList.add(createHsn("02044200", 0, "Goat meat - Other cuts - Frozen", "Meat"));
        hsnList.add(createHsn("02044300", 0, "Goat meat - Boneless - Frozen", "Meat"));
        hsnList.add(createHsn("02050000", 0, "Horse, ass, mule, hinny meat", "Meat"));
        hsnList.add(createHsn("02061000", 0, "Bovine edible offal - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02062100", 0, "Bovine edible offal - Tongues - Frozen", "Meat"));
        hsnList.add(createHsn("02062200", 0, "Bovine edible offal - Livers - Frozen", "Meat"));
        hsnList.add(createHsn("02062900", 0, "Bovine edible offal - Other - Frozen", "Meat"));
        hsnList.add(createHsn("02071000", 0, "Chicken meat - Not cut in pieces - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02071100", 0, "Chicken meat - Not cut in pieces - Frozen", "Meat"));
        hsnList.add(createHsn("02071200", 0, "Chicken meat - Cuts - Frozen", "Meat"));
        hsnList.add(createHsn("02071300", 0, "Chicken meat - Livers - Frozen", "Meat"));
        hsnList.add(createHsn("02071400", 0, "Turkey meat - Not cut - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02072400", 0, "Turkey meat - Not cut - Frozen", "Meat"));
        hsnList.add(createHsn("02072500", 0, "Turkey meat - Cuts - Frozen", "Meat"));
        hsnList.add(createHsn("02072600", 0, "Duck meat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02072700", 0, "Duck meat - Frozen", "Meat"));
        hsnList.add(createHsn("02073200", 0, "Goose meat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02073300", 0, "Goose meat - Frozen", "Meat"));
        hsnList.add(createHsn("02073400", 0, "Guinea fowl meat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02073500", 0, "Guinea fowl meat - Frozen", "Meat"));
        hsnList.add(createHsn("02081000", 0, "Rabbit meat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02082000", 0, "Rabbit meat - Frozen", "Meat"));
        hsnList.add(createHsn("02083000", 0, "Frog legs", "Meat"));
        hsnList.add(createHsn("02084000", 0, "Other meat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02085000", 0, "Other meat - Frozen", "Meat"));
        hsnList.add(createHsn("02089000", 0, "Flours, meals, pellets of meat", "Meat"));
        hsnList.add(createHsn("02091000", 0, "Pig fat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02099000", 0, "Poultry fat - Fresh/chilled", "Meat"));
        hsnList.add(createHsn("02101100", 0, "Hams, shoulders - Salted", "Meat"));
        hsnList.add(createHsn("02101200", 0, "Hams, shoulders - Dried/smoked", "Meat"));
        hsnList.add(createHsn("02101900", 0, "Swine meat - Salted", "Meat"));
        hsnList.add(createHsn("02102000", 0, "Bovine meat - Salted", "Meat"));
        hsnList.add(createHsn("02109100", 0, "Primates meat - Salted", "Meat"));
        hsnList.add(createHsn("02109200", 0, "Whales meat - Salted", "Meat"));
        hsnList.add(createHsn("02109300", 0, "Reptiles meat - Salted", "Meat"));
        hsnList.add(createHsn("02109900", 0, "Other meat - Salted", "Meat"));
        
        // CHAPTER 3: FISH AND CRUSTACEANS
        hsnList.add(createHsn("03019100", 0, "Live trout", "Fish"));
        hsnList.add(createHsn("03019200", 0, "Live eels", "Fish"));
        hsnList.add(createHsn("03019300", 0, "Live carp", "Fish"));
        hsnList.add(createHsn("03019400", 0, "Live bluefin tuna", "Fish"));
        hsnList.add(createHsn("03019500", 0, "Live southern bluefin tuna", "Fish"));
        hsnList.add(createHsn("03019900", 0, "Other live fish", "Fish"));
        hsnList.add(createHsn("03021100", 0, "Trout - Fresh/chilled", "Fish"));
        hsnList.add(createHsn("03021300", 0, "Flatfish - Fresh/chilled", "Fish"));
        hsnList.add(createHsn("03021400", 0, "Tuna - Fresh/chilled", "Fish"));
        hsnList.add(createHsn("03021500", 0, "Skipjack - Fresh/chilled", "Fish"));
        hsnList.add(createHsn("03021600", 0, "Herrings - Fresh/chilled", "Fish"));
        hsnList.add(createHsn("03021700", 0, "Cod - Fresh/chilled", "Fish"));
        hsnList.add(createHsn("03021900", 0, "Other fish - Fresh/chilled", "Fish"));
        hsnList.add(createHsn("03022100", 0, "Trout - Frozen", "Fish"));
        hsnList.add(createHsn("03022300", 0, "Flatfish - Frozen", "Fish"));
        hsnList.add(createHsn("03022400", 0, "Tuna - Frozen", "Fish"));
        hsnList.add(createHsn("03022500", 0, "Skipjack - Frozen", "Fish"));
        hsnList.add(createHsn("03022600", 0, "Herrings - Frozen", "Fish"));
        hsnList.add(createHsn("03022700", 0, "Cod - Frozen", "Fish"));
        hsnList.add(createHsn("03022900", 0, "Other fish - Frozen", "Fish"));
        hsnList.add(createHsn("03031000", 0, "Salmon fillets - Frozen", "Fish"));
        hsnList.add(createHsn("03032000", 0, "Trout fillets - Frozen", "Fish"));
        hsnList.add(createHsn("03033000", 0, "Flatfish fillets - Frozen", "Fish"));
        hsnList.add(createHsn("03034100", 0, "Tuna fillets - Frozen", "Fish"));
        hsnList.add(createHsn("03034200", 0, "Skipjack fillets - Frozen", "Fish"));
        hsnList.add(createHsn("03034300", 0, "Herring fillets - Frozen", "Fish"));
        hsnList.add(createHsn("03034900", 0, "Other fish fillets - Frozen", "Fish"));
        hsnList.add(createHsn("03035100", 0, "Herring - Dried", "Fish"));
        hsnList.add(createHsn("03035200", 0, "Cod - Dried", "Fish"));
        hsnList.add(createHsn("03035900", 0, "Other fish - Dried", "Fish"));
        hsnList.add(createHsn("03036300", 0, "Cod - Smoked", "Fish"));
        hsnList.add(createHsn("03036400", 0, "Herring - Smoked", "Fish"));
        hsnList.add(createHsn("03036600", 0, "Salmon - Smoked", "Fish"));
        hsnList.add(createHsn("03036700", 0, "Flatfish - Smoked", "Fish"));
        hsnList.add(createHsn("03037100", 0, "Fish fins - Dried", "Fish"));
        hsnList.add(createHsn("03037200", 0, "Fish heads - Dried", "Fish"));
        hsnList.add(createHsn("03037300", 0, "Fish maws - Dried", "Fish"));
        hsnList.add(createHsn("03037400", 0, "Shark fins - Dried", "Fish"));
        hsnList.add(createHsn("03037500", 0, "Fish heads, tails, maws - Frozen", "Fish"));
        hsnList.add(createHsn("03038100", 0, "Dogfish - Liver", "Fish"));
        hsnList.add(createHsn("03038200", 0, "Shark - Liver", "Fish"));
        hsnList.add(createHsn("03038300", 0, "Ray - Liver", "Fish"));
        hsnList.add(createHsn("03038900", 0, "Other fish liver - Frozen", "Fish"));
        hsnList.add(createHsn("03039000", 0, "Fish livers - Dried", "Fish"));
        hsnList.add(createHsn("03043100", 0, "Frozen shrimps/prawns", "Fish"));
        hsnList.add(createHsn("03043200", 0, "Frozen lobsters", "Fish"));
        hsnList.add(createHsn("03043300", 0, "Frozen crabs", "Fish"));
        hsnList.add(createHsn("03043900", 0, "Frozen crustaceans - Other", "Fish"));
        hsnList.add(createHsn("03044100", 0, "Shrimps/prawns - Dried", "Fish"));
        hsnList.add(createHsn("03044200", 0, "Lobsters - Dried", "Fish"));
        hsnList.add(createHsn("03044300", 0, "Crabs - Dried", "Fish"));
        hsnList.add(createHsn("03044400", 0, "Crustaceans - Salted", "Fish"));
        hsnList.add(createHsn("03045100", 0, "Oysters - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03045200", 0, "Scallops - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03045300", 0, "Mussels - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03045400", 0, "Cuttle fish - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03045500", 0, "Squid - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03045600", 0, "Octopus - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03047100", 0, "Molluscs - Frozen", "Fish"));
        hsnList.add(createHsn("03047200", 0, "Molluscs - Dried", "Fish"));
        hsnList.add(createHsn("03047300", 0, "Molluscs - Salted", "Fish"));
        hsnList.add(createHsn("03048100", 0, "Sea cucumbers - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03048200", 0, "Sea urchins - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03048300", 0, "Jellyfish - Live/fresh/chilled", "Fish"));
        hsnList.add(createHsn("03049000", 0, "Aquatic invertebrates - Other", "Fish"));
        
        // CHAPTER 4: DAIRY PRODUCE
        hsnList.add(createHsn("04011000", 5, "Milk - Not concentrated - Fat content <=1%", "Food"));
        hsnList.add(createHsn("04012000", 5, "Milk - Not concentrated - Fat content >1% but <=6%", "Food"));
        hsnList.add(createHsn("04013000", 5, "Milk - Not concentrated - Fat content >6%", "Food"));
        hsnList.add(createHsn("04021000", 5, "Milk - Powder - Fat content <=1.5%", "Food"));
        hsnList.add(createHsn("04022100", 5, "Milk - Powder - Fat content >1.5% - Not added sugar", "Food"));
        hsnList.add(createHsn("04022900", 5, "Milk - Powder - Fat content >1.5% - Added sugar", "Food"));
        hsnList.add(createHsn("04029100", 5, "Milk - Concentrated - Not added sugar", "Food"));
        hsnList.add(createHsn("04029900", 5, "Milk - Concentrated - Added sugar", "Food"));
        hsnList.add(createHsn("04031000", 5, "Yogurt", "Food"));
        hsnList.add(createHsn("04039000", 5, "Buttermilk, curdled milk", "Food"));
        hsnList.add(createHsn("04041000", 5, "Whey - Fresh", "Food"));
        hsnList.add(createHsn("04049000", 5, "Products of milk - Natural honey", "Food"));
        hsnList.add(createHsn("04051000", 5, "Butter - Actual weight <=1kg", "Food"));
        hsnList.add(createHsn("04052000", 5, "Dairy spreads", "Food"));
        hsnList.add(createHsn("04059000", 5, "Butter - Actual weight >1kg", "Food"));
        hsnList.add(createHsn("04061000", 5, "Fresh cheese - Unfermented", "Food"));
        hsnList.add(createHsn("04062000", 5, "Processed cheese - Grated/powdered", "Food"));
        hsnList.add(createHsn("04063000", 5, "Processed cheese - Not grated", "Food"));
        hsnList.add(createHsn("04064000", 5, "Blue-veined cheese", "Food"));
        hsnList.add(createHsn("04069000", 5, "Other cheese", "Food"));
        hsnList.add(createHsn("04071100", 5, "Birds eggs - Fresh - Fertilised", "Food"));
        hsnList.add(createHsn("04071900", 5, "Birds eggs - Fresh - Unfertilised", "Food"));
        hsnList.add(createHsn("04072100", 5, "Birds eggs - Preserved - Fertilised", "Food"));
        hsnList.add(createHsn("04072900", 5, "Birds eggs - Preserved - Unfertilised", "Food"));
        hsnList.add(createHsn("04081100", 0, "Dried egg yolks - Unfit for human", "Food"));
        hsnList.add(createHsn("04081900", 0, "Dried egg yolks - Edible", "Food"));
        hsnList.add(createHsn("04089100", 0, "Other eggs - Not in shell - Unfit", "Food"));
        hsnList.add(createHsn("04089900", 0, "Other eggs - Not in shell - Edible", "Food"));
        hsnList.add(createHsn("04090000", 0, "Natural honey", "Food"));
        hsnList.add(createHsn("04100000", 0, "Edible products of animal origin - NEC", "Food"));
        // CHAPTER 5: OTHER ANIMAL PRODUCTS
        hsnList.add(createHsn("05010000", 0, "Human hair - Unworked", "Animal Products"));
        hsnList.add(createHsn("05021000", 0, "Pigs', hogs' bristles - Hair", "Animal Products"));
        hsnList.add(createHsn("05029000", 0, "Badger hair, other brush making hair", "Animal Products"));
        hsnList.add(createHsn("05040000", 0, "Guts, bladders, stomachs of animals", "Animal Products"));
        hsnList.add(createHsn("05051000", 0, "Feathers - For stuffing", "Animal Products"));
        hsnList.add(createHsn("05059000", 0, "Feathers - Other", "Animal Products"));
        hsnList.add(createHsn("05061000", 0, "Bones - Ossein", "Animal Products"));
        hsnList.add(createHsn("05069000", 0, "Bones - Other", "Animal Products"));
        hsnList.add(createHsn("05071000", 0, "Ivory", "Animal Products"));
        hsnList.add(createHsn("05080000", 0, "Coral, shell powder", "Animal Products"));
        hsnList.add(createHsn("05100000", 0, "Ambergris, civet, musk", "Animal Products"));
        hsnList.add(createHsn("05111000", 0, "Bovine semen", "Animal Products"));
        hsnList.add(createHsn("05119100", 0, "Fish waste", "Animal Products"));
        hsnList.add(createHsn("05119900", 0, "Animal products - Other - Dead animals", "Animal Products"));
        
        // CHAPTER 6: LIVE TREES AND OTHER PLANTS
        hsnList.add(createHsn("06011000", 5, "Bulbs, tubers - Dormant", "Plants"));
        hsnList.add(createHsn("06012000", 5, "Bulbs, tubers - Not dormant", "Plants"));
        hsnList.add(createHsn("06021000", 5, "Unrooted cuttings, slips", "Plants"));
        hsnList.add(createHsn("06022000", 5, "Trees, shrubs, bushes - Grafted", "Plants"));
        hsnList.add(createHsn("06023000", 5, "Rhododendrons, azaleas - Grafted", "Plants"));
        hsnList.add(createHsn("06024000", 5, "Roses - Grafted", "Plants"));
        hsnList.add(createHsn("06029000", 5, "Other plants - Grafted/not", "Plants"));
        hsnList.add(createHsn("06031100", 5, "Roses - Fresh", "Plants"));
        hsnList.add(createHsn("06031200", 5, "Carnations - Fresh", "Plants"));
        hsnList.add(createHsn("06031300", 5, "Orchids - Fresh", "Plants"));
        hsnList.add(createHsn("06031400", 5, "Chrysanthemums - Fresh", "Plants"));
        hsnList.add(createHsn("06031500", 5, "Lilies - Fresh", "Plants"));
        hsnList.add(createHsn("06031900", 5, "Other cut flowers - Fresh", "Plants"));
        hsnList.add(createHsn("06039000", 5, "Cut flowers - Dried, dyed", "Plants"));
        hsnList.add(createHsn("06042000", 5, "Foliage - Fresh", "Plants"));
        hsnList.add(createHsn("06049000", 5, "Foliage - Dried, dyed", "Plants"));
        
        // CHAPTER 7: EDIBLE VEGETABLES
        hsnList.add(createHsn("07011000", 0, "Potatoes - Seed", "Agriculture"));
        hsnList.add(createHsn("07019000", 0, "Potatoes - Other", "Agriculture"));
        hsnList.add(createHsn("07020000", 0, "Tomatoes - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07031000", 0, "Onions - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07032000", 0, "Shallots - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07039000", 0, "Leeks, garlic - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07041000", 0, "Cauliflowers - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07042000", 0, "Brussels sprouts - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07049000", 0, "Cabbage, kohlrabi - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07051100", 0, "Lettuce - Cabbage lettuce - Fresh", "Agriculture"));
        hsnList.add(createHsn("07051900", 0, "Lettuce - Other - Fresh", "Agriculture"));
        hsnList.add(createHsn("07052100", 0, "Chicory - Witloof - Fresh", "Agriculture"));
        hsnList.add(createHsn("07052900", 0, "Chicory - Other - Fresh", "Agriculture"));
        hsnList.add(createHsn("07061000", 0, "Carrots - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07069000", 0, "Turnips, radishes - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07070000", 0, "Cucumbers - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07081000", 0, "Peas - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07082000", 0, "Beans - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07089000", 0, "Leguminous vegetables - Other - Fresh", "Agriculture"));
        hsnList.add(createHsn("07092000", 0, "Asparagus - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07093000", 0, "Aubergines - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07094000", 0, "Celery - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07095100", 0, "Mushrooms - Of the genus Agaricus", "Agriculture"));
        hsnList.add(createHsn("07095900", 0, "Mushrooms - Other", "Agriculture"));
        hsnList.add(createHsn("07096000", 0, "Fruits of genus Capsicum/Pimenta", "Agriculture"));
        hsnList.add(createHsn("07097000", 0, "Spinach - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07099100", 0, "Globe artichokes - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07099200", 0, "Olives - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07099300", 0, "Pumpkins, squash - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07099900", 0, "Other vegetables - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07101000", 0, "Potatoes - Frozen", "Agriculture"));
        hsnList.add(createHsn("07102100", 0, "Peas - Frozen", "Agriculture"));
        hsnList.add(createHsn("07102200", 0, "Beans - Frozen", "Agriculture"));
        hsnList.add(createHsn("07102900", 0, "Leguminous vegetables - Frozen", "Agriculture"));
        hsnList.add(createHsn("07103000", 0, "Spinach - Frozen", "Agriculture"));
        hsnList.add(createHsn("07104000", 0, "Sweet corn - Frozen", "Agriculture"));
        hsnList.add(createHsn("07108000", 0, "Other vegetables - Frozen", "Agriculture"));
        hsnList.add(createHsn("07109000", 0, "Vegetable mixtures - Frozen", "Agriculture"));
        hsnList.add(createHsn("07112000", 0, "Olives - Provisionally preserved", "Agriculture"));
        hsnList.add(createHsn("07114000", 0, "Cucumbers/gherkins - Provisionally preserved", "Agriculture"));
        hsnList.add(createHsn("07115100", 0, "Mushrooms - Provisionally preserved", "Agriculture"));
        hsnList.add(createHsn("07119000", 0, "Other vegetables - Provisionally preserved", "Agriculture"));
        hsnList.add(createHsn("07121000", 5, "Onions - Dried", "Agriculture"));
        hsnList.add(createHsn("07122100", 5, "Mushrooms - Dried - Whole", "Agriculture"));
        hsnList.add(createHsn("07122200", 5, "Mushrooms - Dried - Cut", "Agriculture"));
        hsnList.add(createHsn("07123100", 5, "Wood ears - Dried", "Agriculture"));
        hsnList.add(createHsn("07123200", 5, "Jelly fungi - Dried", "Agriculture"));
        hsnList.add(createHsn("07123300", 5, "Mushrooms - Other - Dried", "Agriculture"));
        hsnList.add(createHsn("07123400", 5, "Mushrooms - Other - Cut dried", "Agriculture"));
        hsnList.add(createHsn("07129000", 5, "Vegetables - Dried - Other", "Agriculture"));
        hsnList.add(createHsn("07131000", 0, "Peas - Dried, shelled", "Agriculture"));
        hsnList.add(createHsn("07132000", 0, "Chickpeas - Dried, shelled", "Agriculture"));
        hsnList.add(createHsn("07133100", 0, "Beans - Dried, shelled - Kidney beans", "Agriculture"));
        hsnList.add(createHsn("07133200", 0, "Beans - Dried, shelled - Small red beans", "Agriculture"));
        hsnList.add(createHsn("07133300", 0, "Beans - Dried, shelled - Cow peas", "Agriculture"));
        hsnList.add(createHsn("07133400", 0, "Beans - Dried, shelled - Bambara beans", "Agriculture"));
        hsnList.add(createHsn("07133500", 0, "Beans - Dried, shelled - Other", "Agriculture"));
        hsnList.add(createHsn("07134000", 0, "Lentils - Dried, shelled", "Agriculture"));
        hsnList.add(createHsn("07135000", 0, "Broad beans - Dried, shelled", "Agriculture"));
        hsnList.add(createHsn("07136000", 0, "Pigeon peas - Dried, shelled", "Agriculture"));
        hsnList.add(createHsn("07139000", 0, "Leguminous vegetables - Dried, shelled - Other", "Agriculture"));
        hsnList.add(createHsn("07141000", 0, "Cassava - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07142000", 0, "Sweet potatoes - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07143000", 0, "Yams - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07144000", 0, "Taro - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07145000", 0, "Yautia - Fresh/chilled", "Agriculture"));
        hsnList.add(createHsn("07149000", 0, "Roots/tubers - Other - Fresh/chilled", "Agriculture"));
        
        // CHAPTER 8: EDIBLE FRUIT AND NUTS
        hsnList.add(createHsn("08011100", 0, "Coconuts - Desiccated", "Agriculture"));
        hsnList.add(createHsn("08011200", 0, "Coconuts - Fresh", "Agriculture"));
        hsnList.add(createHsn("08012100", 0, "Brazil nuts - In shell", "Agriculture"));
        hsnList.add(createHsn("08012200", 0, "Brazil nuts - Shelled", "Agriculture"));
        hsnList.add(createHsn("08013100", 0, "Cashew nuts - In shell", "Agriculture"));
        hsnList.add(createHsn("08013200", 0, "Cashew nuts - Shelled", "Agriculture"));
        hsnList.add(createHsn("08021100", 0, "Almonds - In shell", "Agriculture"));
        hsnList.add(createHsn("08021200", 0, "Almonds - Shelled", "Agriculture"));
        hsnList.add(createHsn("08022100", 0, "Hazelnuts - In shell", "Agriculture"));
        hsnList.add(createHsn("08022200", 0, "Hazelnuts - Shelled", "Agriculture"));
        hsnList.add(createHsn("08023100", 0, "Walnuts - In shell", "Agriculture"));
        hsnList.add(createHsn("08023200", 0, "Walnuts - Shelled", "Agriculture"));
        hsnList.add(createHsn("08024100", 0, "Chestnuts - In shell", "Agriculture"));
        hsnList.add(createHsn("08024200", 0, "Chestnuts - Shelled", "Agriculture"));
        hsnList.add(createHsn("08025100", 0, "Pistachios - Fresh", "Agriculture"));
        hsnList.add(createHsn("08025200", 0, "Pistachios - Dried", "Agriculture"));
        hsnList.add(createHsn("08026100", 0, "Macadamia nuts - In shell", "Agriculture"));
        hsnList.add(createHsn("08026200", 0, "Macadamia nuts - Shelled", "Agriculture"));
        hsnList.add(createHsn("08027000", 0, "Kola nuts", "Agriculture"));
        hsnList.add(createHsn("08028000", 0, "Areca nuts", "Agriculture"));
        hsnList.add(createHsn("08029000", 0, "Other nuts - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("08031000", 0, "Bananas - Plantains - Fresh", "Agriculture"));
        hsnList.add(createHsn("08039000", 0, "Bananas - Other - Fresh", "Agriculture"));
        hsnList.add(createHsn("08041000", 0, "Dates - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("08042000", 0, "Figs - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("08043000", 0, "Pineapples - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("08044000", 0, "Avocados - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("08045000", 0, "Guavas, mangoes - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("08051000", 0, "Oranges - Fresh", "Agriculture"));
        hsnList.add(createHsn("08052000", 0, "Mandarins - Fresh", "Agriculture"));
        hsnList.add(createHsn("08054000", 0, "Grapefruit - Fresh", "Agriculture"));
        hsnList.add(createHsn("08055000", 0, "Lemons - Fresh", "Agriculture"));
        hsnList.add(createHsn("08059000", 0, "Citrus fruit - Other - Fresh", "Agriculture"));
        hsnList.add(createHsn("08061000", 0, "Grapes - Fresh", "Agriculture"));
        hsnList.add(createHsn("08062000", 0, "Grapes - Dried", "Agriculture"));
        hsnList.add(createHsn("08071100", 0, "Watermelons - Fresh", "Agriculture"));
        hsnList.add(createHsn("08071900", 0, "Melons - Other - Fresh", "Agriculture"));
        hsnList.add(createHsn("08072000", 0, "Papaws - Fresh", "Agriculture"));
        hsnList.add(createHsn("08081000", 0, "Apples - Fresh", "Agriculture"));
        hsnList.add(createHsn("08082000", 0, "Pears - Fresh", "Agriculture"));
        hsnList.add(createHsn("08083000", 0, "Quinces - Fresh", "Agriculture"));
        hsnList.add(createHsn("08091000", 0, "Apricots - Fresh", "Agriculture"));
        hsnList.add(createHsn("08092100", 0, "Cherries - Sour - Fresh", "Agriculture"));
        hsnList.add(createHsn("08092900", 0, "Cherries - Other - Fresh", "Agriculture"));
        hsnList.add(createHsn("08093000", 0, "Peaches - Fresh", "Agriculture"));
        hsnList.add(createHsn("08094000", 0, "Plums, sloes - Fresh", "Agriculture"));
        hsnList.add(createHsn("08101000", 0, "Strawberries - Fresh", "Agriculture"));
        hsnList.add(createHsn("08102000", 0, "Raspberries - Fresh", "Agriculture"));
        hsnList.add(createHsn("08103000", 0, "Blackberries - Fresh", "Agriculture"));
        hsnList.add(createHsn("08104000", 0, "Cranberries - Fresh", "Agriculture"));
        hsnList.add(createHsn("08105000", 0, "Kiwifruit - Fresh", "Agriculture"));
        hsnList.add(createHsn("08106000", 0, "Durians - Fresh", "Agriculture"));
        hsnList.add(createHsn("08107000", 0, "Persimmons - Fresh", "Agriculture"));
        hsnList.add(createHsn("08109000", 0, "Other fruit - Fresh", "Agriculture"));
        hsnList.add(createHsn("08111000", 0, "Strawberries - Frozen", "Agriculture"));
        hsnList.add(createHsn("08112000", 0, "Raspberries - Frozen", "Agriculture"));
        hsnList.add(createHsn("08119000", 0, "Other fruit - Frozen", "Agriculture"));
        hsnList.add(createHsn("08121000", 0, "Cherries - Provisionally preserved", "Agriculture"));
        hsnList.add(createHsn("08129000", 0, "Other fruit - Provisionally preserved", "Agriculture"));
        hsnList.add(createHsn("08131000", 0, "Apricots - Dried", "Agriculture"));
        hsnList.add(createHsn("08132000", 0, "Prunes - Dried", "Agriculture"));
        hsnList.add(createHsn("08133000", 0, "Apples - Dried", "Agriculture"));
        hsnList.add(createHsn("08134000", 0, "Other fruit - Dried", "Agriculture"));
        hsnList.add(createHsn("08135000", 0, "Mixtures of nuts/dried fruit", "Agriculture"));
        hsnList.add(createHsn("08140000", 0, "Peel of citrus fruit/melons - Fresh/frozen/dried", "Agriculture"));
        
        // CHAPTER 9: COFFEE, TEA, MATE AND SPICES
        hsnList.add(createHsn("09011100", 0, "Coffee - Not roasted - Not decaffeinated", "Food"));
        hsnList.add(createHsn("09011200", 0, "Coffee - Not roasted - Decaffeinated", "Food"));
        hsnList.add(createHsn("09012100", 0, "Coffee - Roasted - Not decaffeinated", "Food"));
        hsnList.add(createHsn("09012200", 0, "Coffee - Roasted - Decaffeinated", "Food"));
        hsnList.add(createHsn("09019000", 0, "Coffee husks, skins, substitutes", "Food"));
        hsnList.add(createHsn("09021000", 5, "Green tea - Not fermented", "Food"));
        hsnList.add(createHsn("09022000", 5, "Black tea - Fermented", "Food"));
        hsnList.add(createHsn("09023000", 5, "Black tea - Fermented with tea", "Food"));
        hsnList.add(createHsn("09024000", 5, "Other black tea", "Food"));
        hsnList.add(createHsn("09030000", 5, "Mate", "Food"));
        hsnList.add(createHsn("09041100", 5, "Pepper - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09041200", 5, "Pepper - Crushed or ground", "Food"));
        hsnList.add(createHsn("09042100", 5, "Chillies - Dried - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09042200", 5, "Chillies - Dried - Crushed or ground", "Food"));
        hsnList.add(createHsn("09051000", 5, "Vanilla - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09052000", 5, "Vanilla - Crushed or ground", "Food"));
        hsnList.add(createHsn("09061100", 5, "Cinnamon/Cassia - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09061900", 5, "Cinnamon/Cassia - Crushed or ground", "Food"));
        hsnList.add(createHsn("09062000", 5, "Cinnamon-tree flowers", "Food"));
        hsnList.add(createHsn("09070000", 5, "Cloves - Whole fruit, cloves, stems", "Food"));
        hsnList.add(createHsn("09081100", 5, "Nutmeg - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09081200", 5, "Mace - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09082100", 5, "Nutmeg - Crushed or ground", "Food"));
        hsnList.add(createHsn("09082200", 5, "Mace - Crushed or ground", "Food"));
        hsnList.add(createHsn("09083100", 5, "Cardamoms - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09083200", 5, "Cardamoms - Crushed or ground", "Food"));
        hsnList.add(createHsn("09092100", 5, "Seeds of coriander - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09092200", 5, "Seeds of coriander - Crushed or ground", "Food"));
        hsnList.add(createHsn("09093100", 5, "Seeds of cumin - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09093200", 5, "Seeds of cumin - Crushed or ground", "Food"));
        hsnList.add(createHsn("09096100", 5, "Seeds of anise/badian/fennel - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09096200", 5, "Seeds of anise/badian/fennel - Crushed or ground", "Food"));
        hsnList.add(createHsn("09101000", 5, "Ginger - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09102000", 5, "Saffron", "Food"));
        hsnList.add(createHsn("09103000", 5, "Turmeric/curry - Neither crushed nor ground", "Food"));
        hsnList.add(createHsn("09109100", 5, "Mixtures referred to in note 1(b)", "Food"));
        hsnList.add(createHsn("09109900", 5, "Other spices - Mixtures", "Food"));
        
        // CHAPTER 10: CEREALS
        hsnList.add(createHsn("10011100", 0, "Durum wheat - Seed", "Agriculture"));
        hsnList.add(createHsn("10011900", 0, "Durum wheat - Other", "Agriculture"));
        hsnList.add(createHsn("10019100", 0, "Wheat/Meslin - Seed", "Agriculture"));
        hsnList.add(createHsn("10019900", 0, "Wheat/Meslin - Other", "Agriculture"));
        hsnList.add(createHsn("10021000", 0, "Rye - Seed", "Agriculture"));
        hsnList.add(createHsn("10029000", 0, "Rye - Other", "Agriculture"));
        hsnList.add(createHsn("10031000", 0, "Barley - Seed", "Agriculture"));
        hsnList.add(createHsn("10039000", 0, "Barley - Other", "Agriculture"));
        hsnList.add(createHsn("10041000", 0, "Oats - Seed", "Agriculture"));
        hsnList.add(createHsn("10049000", 0, "Oats - Other", "Agriculture"));
        hsnList.add(createHsn("10051000", 0, "Maize (corn) - Seed", "Agriculture"));
        hsnList.add(createHsn("10059000", 0, "Maize (corn) - Other", "Agriculture"));
        hsnList.add(createHsn("10061000", 0, "Rice - In the husk (paddy/g rough)", "Agriculture"));
        hsnList.add(createHsn("10062000", 0, "Rice - Husked (brown)", "Agriculture"));
        hsnList.add(createHsn("10063000", 0, "Rice - Semi-milled/wholly milled", "Agriculture"));
        hsnList.add(createHsn("10064000", 0, "Rice - Broken", "Agriculture"));
        hsnList.add(createHsn("10071000", 0, "Grain sorghum - Seed", "Agriculture"));
        hsnList.add(createHsn("10079000", 0, "Grain sorghum - Other", "Agriculture"));
        hsnList.add(createHsn("10081000", 0, "Buckwheat - Seed", "Agriculture"));
        hsnList.add(createHsn("10082100", 0, "Millet - Seed", "Agriculture"));
        hsnList.add(createHsn("10082900", 0, "Millet - Other", "Agriculture"));
        hsnList.add(createHsn("10083000", 0, "Canary seed", "Agriculture"));
        hsnList.add(createHsn("10089000", 0, "Other cereals", "Agriculture"));
        
        // CHAPTER 11: MILLING INDUSTRY PRODUCTS
        hsnList.add(createHsn("11010000", 0, "Wheat/Meslin flour", "Food"));
        hsnList.add(createHsn("11022000", 5, "Maize (corn) flour", "Food"));
        hsnList.add(createHsn("11029000", 5, "Other cereal flours", "Food"));
        hsnList.add(createHsn("11031100", 5, "Wheat groats", "Food"));
        hsnList.add(createHsn("11031300", 5, "Maize groats", "Food"));
        hsnList.add(createHsn("11031900", 5, "Other cereal groats", "Food"));
        hsnList.add(createHsn("11032000", 5, "Cereal pellets", "Food"));
        hsnList.add(createHsn("11041200", 5, "Rolled/Flaked oats", "Food"));
        hsnList.add(createHsn("11041900", 5, "Other rolled/flaked grain", "Food"));
        hsnList.add(createHsn("11042200", 5, "Rice - Husked", "Food"));
        hsnList.add(createHsn("11042300", 5, "Rice - Semi-milled", "Food"));
        hsnList.add(createHsn("11042900", 5, "Other worked grain", "Food"));
        hsnList.add(createHsn("11043000", 5, "Germ of cereals - Whole/rolled/flaked", "Food"));
        hsnList.add(createHsn("11051000", 5, "Potato flour/meal/powder", "Food"));
        hsnList.add(createHsn("11052000", 5, "Potato flakes", "Food"));
        hsnList.add(createHsn("11061000", 5, "Flour/meal of dried leguminous vegetables", "Food"));
        hsnList.add(createHsn("11062000", 5, "Flour/meal of sago", "Food"));
        hsnList.add(createHsn("11063000", 5, "Flour/meal of roots/tubers", "Food"));
        hsnList.add(createHsn("11071000", 5, "Malt - Not roasted", "Food"));
        hsnList.add(createHsn("11072000", 5, "Malt - Roasted", "Food"));
        hsnList.add(createHsn("11081100", 5, "Wheat starch", "Food"));
        hsnList.add(createHsn("11081200", 5, "Maize (corn) starch", "Food"));
        hsnList.add(createHsn("11081300", 5, "Potato starch", "Food"));
        hsnList.add(createHsn("11081400", 5, "Manioc (cassava) starch", "Food"));
        hsnList.add(createHsn("11081900", 5, "Other starches", "Food"));
        hsnList.add(createHsn("11082000", 5, "Inulin", "Food"));
        hsnList.add(createHsn("11090000", 5, "Wheat gluten - Whether or not dried", "Food"));
        hsnList.add(createHsn("1107", 5, "Malt, whether or not roasted", "Food"));
        hsnList.add(createHsn("1108", 5, "Starches; inulin", "Food"));
        hsnList.add(createHsn("1109", 5, "Wheat gluten, whether or not dried", "Food"));
        
        // Chapter 12: Oil Seeds, Grains
        hsnList.add(createHsn("1201", 5, "Soya beans, whether or not broken", "Agriculture"));
        hsnList.add(createHsn("1202", 5, "Ground-nuts, not roasted or otherwise cooked", "Agriculture"));
        hsnList.add(createHsn("1203", 5, "Copra", "Agriculture"));
        hsnList.add(createHsn("1204", 5, "Linseed, whether or not broken", "Agriculture"));
        hsnList.add(createHsn("1205", 5, "Rape or colza seeds, whether or not broken", "Agriculture"));
        // CHAPTER 12: OIL SEEDS AND OLEAGINOUS FRUITS
        hsnList.add(createHsn("12011000", 5, "Soya beans - Seed", "Agriculture"));
        hsnList.add(createHsn("12019000", 5, "Soya beans - Other", "Agriculture"));
        hsnList.add(createHsn("12024100", 5, "Ground-nuts - In shell - Seed", "Agriculture"));
        hsnList.add(createHsn("12024200", 5, "Ground-nuts - In shell - Other", "Agriculture"));
        hsnList.add(createHsn("12030000", 5, "Copra", "Agriculture"));
        hsnList.add(createHsn("12040000", 5, "Linseed - Whether or not broken", "Agriculture"));
        hsnList.add(createHsn("12051000", 5, "Rape seeds - Low erucic acid", "Agriculture"));
        hsnList.add(createHsn("12059000", 5, "Rape seeds - Other", "Agriculture"));
        hsnList.add(createHsn("12060000", 5, "Sunflower seeds", "Agriculture"));
        hsnList.add(createHsn("12071000", 5, "Palm nuts and kernels", "Agriculture"));
        hsnList.add(createHsn("12072100", 5, "Cotton seeds - Seed", "Agriculture"));
        hsnList.add(createHsn("12072900", 5, "Cotton seeds - Other", "Agriculture"));
        hsnList.add(createHsn("12074000", 5, "Sesamum seeds", "Agriculture"));
        hsnList.add(createHsn("12075000", 5, "Mustard seeds", "Agriculture"));
        hsnList.add(createHsn("12076000", 5, "Safflower seeds", "Agriculture"));
        hsnList.add(createHsn("12077000", 5, "Melon seeds", "Agriculture"));
        hsnList.add(createHsn("12079100", 5, "Poppy seeds", "Agriculture"));
        hsnList.add(createHsn("12079900", 5, "Other oil seeds", "Agriculture"));
        hsnList.add(createHsn("12081000", 5, "Flours of soya beans", "Agriculture"));
        hsnList.add(createHsn("12089000", 5, "Flours of other oil seeds", "Agriculture"));
        hsnList.add(createHsn("12091000", 5, "Sugar beet seed", "Agriculture"));
        hsnList.add(createHsn("12092100", 5, "Lucerne (alfalfa) seed", "Agriculture"));
        hsnList.add(createHsn("12092200", 5, "Clover seed", "Agriculture"));
        hsnList.add(createHsn("12092300", 5, "Fescue seed", "Agriculture"));
        hsnList.add(createHsn("12092400", 5, "Kentucky blue grass seed", "Agriculture"));
        hsnList.add(createHsn("12092500", 5, "Rye grass seed", "Agriculture"));
        hsnList.add(createHsn("12092900", 5, "Seeds of forage plants - Other", "Agriculture"));
        hsnList.add(createHsn("12093000", 5, "Seeds of herbaceous plants", "Agriculture"));
        hsnList.add(createHsn("12099100", 5, "Vegetable seeds", "Agriculture"));
        hsnList.add(createHsn("12099900", 5, "Other seeds, fruit and spores", "Agriculture"));
        hsnList.add(createHsn("12101000", 5, "Hop cones - Fresh", "Agriculture"));
        hsnList.add(createHsn("12102000", 5, "Hop cones - Dried", "Agriculture"));
        hsnList.add(createHsn("12112000", 5, "Ginseng roots - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("12113000", 5, "Coca leaf", "Agriculture"));
        hsnList.add(createHsn("12114000", 5, "Poppy straw", "Agriculture"));
        hsnList.add(createHsn("12119000", 5, "Other plants/parts for pharmacy/perfumery", "Agriculture"));
        hsnList.add(createHsn("12122100", 5, "Seaweeds - Fit for human consumption", "Agriculture"));
        hsnList.add(createHsn("12122900", 5, "Seaweeds - Other", "Agriculture"));
        hsnList.add(createHsn("12129100", 5, "Sugar beet - Fresh/dried", "Agriculture"));
        hsnList.add(createHsn("12129200", 5, "Locust beans", "Agriculture"));
        hsnList.add(createHsn("12129300", 5, "Sugar cane", "Agriculture"));
        hsnList.add(createHsn("12129400", 5, "Chicory roots", "Agriculture"));
        hsnList.add(createHsn("12129900", 5, "Other vegetable products", "Agriculture"));
        hsnList.add(createHsn("12130000", 0, "Cereal straw and husks", "Agriculture"));
        hsnList.add(createHsn("12141000", 5, "Lucerne (alfalfa) meal and pellets", "Agriculture"));
        hsnList.add(createHsn("12149000", 5, "Other forage products", "Agriculture"));
        
        // CHAPTER 13: LAC, GUMS, RESINS AND OTHER VEGETABLE SAPS
        hsnList.add(createHsn("13011000", 5, "Lac - Natural gums", "Agriculture"));
        hsnList.add(createHsn("13012000", 5, "Lac - Natural resins", "Agriculture"));
        hsnList.add(createHsn("13019000", 5, "Lac - Other", "Agriculture"));
        hsnList.add(createHsn("13021100", 5, "Opium", "Agriculture"));
        hsnList.add(createHsn("13021200", 5, "Liquorice extract", "Agriculture"));
        hsnList.add(createHsn("13021300", 5, "Hop extract", "Agriculture"));
        hsnList.add(createHsn("13021400", 5, "Pyrethrum extract", "Agriculture"));
        hsnList.add(createHsn("13021900", 5, "Other vegetable saps and extracts", "Agriculture"));
        hsnList.add(createHsn("13022000", 5, "Pectates, pectinates", "Agriculture"));
        hsnList.add(createHsn("13023100", 5, "Agar-agar", "Agriculture"));
        hsnList.add(createHsn("13023200", 5, "Mucilages from locust beans", "Agriculture"));
        hsnList.add(createHsn("13023900", 5, "Other mucilages and thickeners", "Agriculture"));
        
        // CHAPTER 14: VEGETABLE PLAITING MATERIALS
        hsnList.add(createHsn("14011000", 5, "Bamboos", "Agriculture"));
        hsnList.add(createHsn("14012000", 5, "Rattans", "Agriculture"));
        hsnList.add(createHsn("14019000", 5, "Other vegetable plaiting materials", "Agriculture"));
        hsnList.add(createHsn("14042000", 5, "Cotton linters", "Agriculture"));
        hsnList.add(createHsn("14049000", 5, "Other vegetable products", "Agriculture"));
        
        // CHAPTER 15: ANIMAL OR VEGETABLE FATS AND OILS
        hsnList.add(createHsn("15011000", 5, "Pig fat - Lard", "Food"));
        hsnList.add(createHsn("15019000", 5, "Pig fat - Other", "Food"));
        hsnList.add(createHsn("15020000", 5, "Fats of bovine animals/sheep/goats", "Food"));
        hsnList.add(createHsn("15030000", 5, "Lard stearin, lard oil", "Food"));
        hsnList.add(createHsn("15041000", 5, "Fish-liver oils", "Food"));
        hsnList.add(createHsn("15042000", 5, "Fats/oils of fish - Other", "Food"));
        hsnList.add(createHsn("15043000", 5, "Marine mammal oils", "Food"));
        hsnList.add(createHsn("15050000", 5, "Wool grease and derivatives", "Food"));
        hsnList.add(createHsn("15060000", 5, "Other animal fats and oils", "Food"));
        hsnList.add(createHsn("15071000", 5, "Soya-bean oil - Crude", "Food"));
        hsnList.add(createHsn("15079000", 5, "Soya-bean oil - Refined", "Food"));
        hsnList.add(createHsn("15081000", 5, "Ground-nut oil - Crude", "Food"));
        hsnList.add(createHsn("15089000", 5, "Ground-nut oil - Refined", "Food"));
        hsnList.add(createHsn("15091000", 5, "Olive oil - Virgin", "Food"));
        hsnList.add(createHsn("15099000", 5, "Olive oil - Other", "Food"));
        hsnList.add(createHsn("15100000", 5, "Other oils from olives", "Food"));
        hsnList.add(createHsn("15111000", 5, "Palm oil - Crude", "Food"));
        hsnList.add(createHsn("15119000", 5, "Palm oil - Refined", "Food"));
        hsnList.add(createHsn("15121100", 5, "Sunflower-seed oil - Crude", "Food"));
        hsnList.add(createHsn("15121900", 5, "Sunflower-seed oil - Refined", "Food"));
        hsnList.add(createHsn("15122100", 5, "Cotton-seed oil - Crude", "Food"));
        hsnList.add(createHsn("15122900", 5, "Cotton-seed oil - Refined", "Food"));
        hsnList.add(createHsn("15131100", 5, "Coconut (copra) oil - Crude", "Food"));
        hsnList.add(createHsn("15131900", 5, "Coconut (copra) oil - Refined", "Food"));
        hsnList.add(createHsn("15132100", 5, "Palm kernel oil - Crude", "Food"));
        hsnList.add(createHsn("15132900", 5, "Palm kernel oil - Refined", "Food"));
        hsnList.add(createHsn("15141100", 5, "Rape oil - Low erucic acid - Crude", "Food"));
        hsnList.add(createHsn("15141900", 5, "Rape oil - Low erucic acid - Refined", "Food"));
        hsnList.add(createHsn("15149100", 5, "Rape oil - Other - Crude", "Food"));
        hsnList.add(createHsn("15149900", 5, "Rape oil - Other - Refined", "Food"));
        hsnList.add(createHsn("15151100", 5, "Linseed oil - Crude", "Food"));
        hsnList.add(createHsn("15151900", 5, "Linseed oil - Refined", "Food"));
        hsnList.add(createHsn("15152100", 5, "Maize (corn) oil - Crude", "Food"));
        hsnList.add(createHsn("15152900", 5, "Maize (corn) oil - Refined", "Food"));
        hsnList.add(createHsn("15153000", 5, "Castor oil", "Food"));
        hsnList.add(createHsn("15155000", 5, "Sesame oil", "Food"));
        hsnList.add(createHsn("15159000", 5, "Other fixed vegetable fats/oils", "Food"));
        hsnList.add(createHsn("15161000", 5, "Animal fats/oils - Hydrogenated", "Food"));
        hsnList.add(createHsn("15162000", 5, "Vegetable fats/oils - Hydrogenated", "Food"));
        hsnList.add(createHsn("15171000", 5, "Margarine - Not containing milk fats", "Food"));
        hsnList.add(createHsn("15179000", 5, "Other edible mixtures", "Food"));
        hsnList.add(createHsn("15180000", 5, "Animal/vegetable fats/oils - Chemically modified", "Food"));
        
        // CHAPTER 16: PREPARATIONS OF MEAT, FISH
        hsnList.add(createHsn("16010000", 12, "Sausages and similar products", "Food"));
        hsnList.add(createHsn("16021000", 12, "Homogenised preparations", "Food"));
        hsnList.add(createHsn("16023200", 12, "Chicken meat preparations", "Food"));
        hsnList.add(createHsn("16023900", 12, "Other poultry meat preparations", "Food"));
        hsnList.add(createHsn("16024100", 12, "Swine hams preparations", "Food"));
        hsnList.add(createHsn("16024900", 12, "Swine meat preparations - Other", "Food"));
        hsnList.add(createHsn("16025000", 12, "Bovine meat preparations", "Food"));
        hsnList.add(createHsn("16029000", 12, "Other meat preparations", "Food"));
        hsnList.add(createHsn("16030000", 12, "Extracts and juices of meat, fish", "Food"));
        hsnList.add(createHsn("16041100", 12, "Salmon - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16041300", 12, "Sardines - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16041400", 12, "Tunas, skipjack - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16041500", 12, "Mackerel - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16041900", 12, "Other fish - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16042000", 12, "Fish - Other prepared/preserved", "Food"));
        hsnList.add(createHsn("16043100", 12, "Caviar", "Food"));
        hsnList.add(createHsn("16043200", 12, "Caviar substitutes", "Food"));
        hsnList.add(createHsn("16051000", 12, "Crab - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16052000", 12, "Shrimps/prawns - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16053000", 12, "Lobster - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16054000", 12, "Other crustaceans - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055100", 12, "Oysters - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055200", 12, "Scallops - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055300", 12, "Mussels - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055400", 12, "Squid - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055500", 12, "Octopus - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055600", 12, "Clams - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055700", 12, "Abalone - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055800", 12, "Snails - Prepared/preserved", "Food"));
        hsnList.add(createHsn("16055900", 12, "Other molluscs - Prepared/preserved", "Food"));
        
        // CHAPTER 17: SUGARS AND SUGAR CONFECTIONERY
        hsnList.add(createHsn("17011100", 5, "Cane sugar - Raw", "Food"));
        hsnList.add(createHsn("17011200", 5, "Beet sugar - Raw", "Food"));
        hsnList.add(createHsn("17019100", 5, "Cane sugar - Refined", "Food"));
        hsnList.add(createHsn("17019900", 5, "Other sugar - Refined", "Food"));
        hsnList.add(createHsn("17021100", 18, "Lactose - Solid form", "Food"));
        hsnList.add(createHsn("17021900", 18, "Lactose - Other", "Food"));
        hsnList.add(createHsn("17022000", 18, "Maple sugar and syrup", "Food"));
        hsnList.add(createHsn("17023000", 18, "Glucose - Solid form", "Food"));
        hsnList.add(createHsn("17024000", 18, "Glucose - Not solid form", "Food"));
        hsnList.add(createHsn("17025000", 18, "Fructose - Solid form", "Food"));
        hsnList.add(createHsn("17026000", 18, "Fructose - Other", "Food"));
        hsnList.add(createHsn("17029000", 18, "Other sugars", "Food"));
        hsnList.add(createHsn("17031000", 18, "Cane molasses", "Food"));
        hsnList.add(createHsn("17039000", 18, "Other molasses", "Food"));
        hsnList.add(createHsn("17041000", 18, "Chewing gum", "Food"));
        hsnList.add(createHsn("17049000", 18, "Sugar confectionery", "Food"));
        
        // CHAPTER 18: COCOA AND COCOA PREPARATIONS
        hsnList.add(createHsn("18010000", 0, "Cocoa beans", "Food"));
        hsnList.add(createHsn("18020000", 0, "Cocoa shells, husks, waste", "Food"));
        hsnList.add(createHsn("18031000", 0, "Cocoa paste - Not defatted", "Food"));
        hsnList.add(createHsn("18032000", 0, "Cocoa paste - Defatted", "Food"));
        hsnList.add(createHsn("18040000", 0, "Cocoa butter, fat and oil", "Food"));
        hsnList.add(createHsn("18050000", 0, "Cocoa powder", "Food"));
        hsnList.add(createHsn("18061000", 18, "Cocoa powder - Added sugar", "Food"));
        hsnList.add(createHsn("18062000", 18, "Chocolate - In blocks/slabs", "Food"));
        hsnList.add(createHsn("18063100", 18, "Chocolate - Filled", "Food"));
        hsnList.add(createHsn("18063200", 18, "Chocolate - Not filled", "Food"));
        hsnList.add(createHsn("18069000", 18, "Other chocolate preparations", "Food"));
        
        // CHAPTER 19: PREPARATIONS OF CEREALS, FLOUR, STARCH OR MILK
        hsnList.add(createHsn("19011000", 18, "Malt extract", "Food"));
        hsnList.add(createHsn("19012000", 18, "Mixes/doughs for bread/pastry", "Food"));
        hsnList.add(createHsn("19019000", 18, "Other food preparations", "Food"));
        hsnList.add(createHsn("19021100", 18, "Pasta - Uncooked - Not stuffed", "Food"));
        hsnList.add(createHsn("19021900", 18, "Pasta - Other", "Food"));
        hsnList.add(createHsn("19022000", 18, "Pasta - Stuffed", "Food"));
        hsnList.add(createHsn("19023000", 18, "Pasta - Other", "Food"));
        hsnList.add(createHsn("19024000", 18, "Couscous", "Food"));
        hsnList.add(createHsn("19030000", 0, "Tapioca and substitutes", "Food"));
        hsnList.add(createHsn("19041000", 18, "Prepared foods - Swelling/roasting", "Food"));
        hsnList.add(createHsn("19042000", 18, "Prepared foods - Pre-cooked", "Food"));
        hsnList.add(createHsn("19043000", 18, "Bulgur wheat", "Food"));
        hsnList.add(createHsn("19049000", 18, "Other prepared cereals", "Food"));
        hsnList.add(createHsn("19051000", 18, "Bread, pastry, cakes", "Food"));
        hsnList.add(createHsn("19052000", 18, "Gingerbread", "Food"));
        hsnList.add(createHsn("19053100", 18, "Sweet biscuits", "Food"));
        hsnList.add(createHsn("19053200", 18, "Waffles and wafers", "Food"));
        hsnList.add(createHsn("19054000", 18, "Rusks, toasted bread", "Food"));
        hsnList.add(createHsn("19059000", 18, "Other bakers' wares", "Food"));
        
        // CHAPTER 20: PREPARATIONS OF VEGETABLES, FRUIT, NUTS
        hsnList.add(createHsn("20011000", 18, "Cucumbers/gherkins - Preserved by vinegar", "Food"));
        hsnList.add(createHsn("20019000", 18, "Other vegetables - Preserved by vinegar", "Food"));
        hsnList.add(createHsn("20021000", 12, "Tomatoes - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20029000", 12, "Tomatoes - Other", "Food"));
        hsnList.add(createHsn("20031000", 12, "Mushrooms - Of genus Agaricus", "Food"));
        hsnList.add(createHsn("20039000", 12, "Mushrooms - Other", "Food"));
        hsnList.add(createHsn("20041000", 12, "Potatoes - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20049000", 12, "Potatoes - Other", "Food"));
        hsnList.add(createHsn("20051000", 12, "Homogenised vegetables", "Food"));
        hsnList.add(createHsn("20052000", 12, "Potatoes - Other", "Food"));
        hsnList.add(createHsn("20054000", 12, "Peas - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20055100", 12, "Beans - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20055900", 12, "Beans - Other", "Food"));
        hsnList.add(createHsn("20056000", 12, "Asparagus - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20057000", 12, "Olives - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20058000", 12, "Sweet corn - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20059100", 12, "Bamboo shoots", "Food"));
        hsnList.add(createHsn("20059900", 12, "Other vegetables", "Food"));
        hsnList.add(createHsn("20060000", 12, "Fruit/nuts - Preserved by sugar", "Food"));
        hsnList.add(createHsn("20071000", 12, "Homogenised preparations", "Food"));
        hsnList.add(createHsn("20079100", 12, "Citrus fruit - Jams/jellies", "Food"));
        hsnList.add(createHsn("20079900", 12, "Other fruit - Jams/jellies", "Food"));
        hsnList.add(createHsn("20081100", 12, "Ground-nuts - Roasted", "Food"));
        hsnList.add(createHsn("20081900", 12, "Nuts/seeds - Other", "Food"));
        hsnList.add(createHsn("20082000", 12, "Pineapples - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20083000", 12, "Citrus fruit - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20084000", 12, "Pears - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20085000", 12, "Apricots - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20086000", 12, "Cherries - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20087000", 12, "Peaches - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20088000", 12, "Strawberries - Prepared/preserved", "Food"));
        hsnList.add(createHsn("20089100", 12, "Palm hearts", "Food"));
        hsnList.add(createHsn("20089200", 12, "Mixtures", "Food"));
        hsnList.add(createHsn("20089300", 12, "Grapefruit segments", "Food"));
        hsnList.add(createHsn("20089900", 12, "Other fruit", "Food"));
        hsnList.add(createHsn("20091100", 12, "Orange juice - Frozen", "Food"));
        hsnList.add(createHsn("20091200", 12, "Orange juice - Not frozen - Brix <=20", "Food"));
        hsnList.add(createHsn("20091900", 12, "Orange juice - Other", "Food"));
        hsnList.add(createHsn("20092100", 12, "Grapefruit juice - Brix <=20", "Food"));
        hsnList.add(createHsn("20092900", 12, "Grapefruit juice - Other", "Food"));
        hsnList.add(createHsn("20093100", 12, "Juice of citrus fruit - Brix <=20", "Food"));
        hsnList.add(createHsn("20093900", 12, "Juice of citrus fruit - Other", "Food"));
        hsnList.add(createHsn("20094100", 12, "Pineapple juice - Brix <=20", "Food"));
        hsnList.add(createHsn("20094900", 12, "Pineapple juice - Other", "Food"));
        hsnList.add(createHsn("20095000", 12, "Tomato juice", "Food"));
        hsnList.add(createHsn("20096100", 12, "Grape juice - Brix <=30", "Food"));
        hsnList.add(createHsn("20096900", 12, "Grape juice - Other", "Food"));
        hsnList.add(createHsn("20097100", 12, "Apple juice - Brix <=20", "Food"));
        hsnList.add(createHsn("20097900", 12, "Apple juice - Other", "Food"));
        hsnList.add(createHsn("20098100", 12, "Juice of other fruit - Brix <=20", "Food"));
        hsnList.add(createHsn("20098900", 12, "Juice of other fruit - Other", "Food"));
        hsnList.add(createHsn("20099000", 12, "Mixtures of juices", "Food"));
        
        // CHAPTER 21: MISCELLANEOUS EDIBLE PREPARATIONS
        hsnList.add(createHsn("21011100", 18, "Extracts/essences of coffee", "Food"));
        hsnList.add(createHsn("21011200", 18, "Preparations of coffee", "Food"));
        hsnList.add(createHsn("21012000", 18, "Extracts/essences of tea", "Food"));
        hsnList.add(createHsn("21013000", 18, "Roasted chicory", "Food"));
        hsnList.add(createHsn("21021000", 18, "Yeasts - Active", "Food"));
        hsnList.add(createHsn("21022000", 18, "Yeasts - Inactive", "Food"));
        hsnList.add(createHsn("21023000", 18, "Prepared baking powders", "Food"));
        hsnList.add(createHsn("21031000", 18, "Soya sauce", "Food"));
        hsnList.add(createHsn("21032000", 18, "Tomato ketchup", "Food"));
        hsnList.add(createHsn("21033000", 18, "Mustard flour/meal", "Food"));
        hsnList.add(createHsn("21039000", 18, "Other sauces", "Food"));
        hsnList.add(createHsn("21041000", 18, "Soups and broths", "Food"));
        hsnList.add(createHsn("21042000", 18, "Homogenised composite food", "Food"));
        hsnList.add(createHsn("21050000", 18, "Ice cream and other edible ice", "Food"));
        hsnList.add(createHsn("21061000", 18, "Protein concentrates", "Food"));
        hsnList.add(createHsn("21069000", 18, "Other food preparations", "Food"));
        
        // CHAPTER 22: BEVERAGES, SPIRITS AND VINEGAR
        hsnList.add(createHsn("22011000", 18, "Waters - Mineral/aerated", "Beverages"));
        hsnList.add(createHsn("22019000", 18, "Waters - Other", "Beverages"));
        hsnList.add(createHsn("22021000", 28, "Waters - Sweetened", "Beverages"));
        hsnList.add(createHsn("22029100", 28, "Waters - Aerated beverages", "Beverages"));
        hsnList.add(createHsn("22029200", 28, "Waters - Non-alcoholic", "Beverages"));
        hsnList.add(createHsn("22030000", 18, "Beer made from malt", "Beverages"));
        hsnList.add(createHsn("22041000", 18, "Wine - Sparkling", "Beverages"));
        hsnList.add(createHsn("22042100", 18, "Wine - Other grape - <=2L", "Beverages"));
        hsnList.add(createHsn("22042200", 18, "Wine - Other grape - >2L", "Beverages"));
        hsnList.add(createHsn("22043000", 18, "Other grape must", "Beverages"));
        hsnList.add(createHsn("22051000", 18, "Vermouth - <=2L", "Beverages"));
        hsnList.add(createHsn("22059000", 18, "Vermouth - >2L", "Beverages"));
        hsnList.add(createHsn("22060000", 18, "Other fermented beverages", "Beverages"));
        hsnList.add(createHsn("22071000", 18, "Ethyl alcohol - Undenatured - >=80%", "Beverages"));
        hsnList.add(createHsn("22072000", 18, "Ethyl alcohol - Denatured - >=80%", "Beverages"));
        hsnList.add(createHsn("22082000", 18, "Spirits - Grape wine/marc", "Beverages"));
        hsnList.add(createHsn("22083000", 18, "Whiskies", "Beverages"));
        hsnList.add(createHsn("22084000", 18, "Rum and tafia", "Beverages"));
        hsnList.add(createHsn("22085000", 18, "Gin and Geneva", "Beverages"));
        hsnList.add(createHsn("22086000", 18, "Vodka", "Beverages"));
        hsnList.add(createHsn("22087000", 18, "Liqueurs and cordials", "Beverages"));
        hsnList.add(createHsn("22089000", 18, "Other spirits", "Beverages"));
        hsnList.add(createHsn("22090000", 18, "Vinegar and substitutes", "Beverages"));
        
        // Chapter 23: Residues and Waste from Food Industries
        hsnList.add(createHsn("2301", 0, "Flours, meals and pellets, of meat or meat offal", "Animal Feed"));
        hsnList.add(createHsn("2302", 0, "Bran, sharps and other residues", "Animal Feed"));
        hsnList.add(createHsn("2303", 0, "Residues of starch manufacture", "Animal Feed"));
        hsnList.add(createHsn("2304", 0, "Oil-cake and other solid residues", "Animal Feed"));
        hsnList.add(createHsn("2305", 0, "Oil-cake and other solid residues of coconut or copra", "Animal Feed"));
        hsnList.add(createHsn("2306", 0, "Oil-cake and other solid residues of other vegetable fats", "Animal Feed"));
        hsnList.add(createHsn("2307", 0, "Wine lees; argol", "Animal Feed"));
        hsnList.add(createHsn("2308", 0, "Vegetable materials and vegetable waste", "Animal Feed"));
        hsnList.add(createHsn("2309", 0, "Preparations of a kind used in animal feeding", "Animal Feed"));
        
        // Chapter 24: Tobacco and Manufactured Tobacco Substitutes
        hsnList.add(createHsn("2401", 28, "Tobacco, unmanufactured; tobacco refuse", "Tobacco"));
        hsnList.add(createHsn("2402", 28, "Cigars, cheroots, cigarillos and cigarettes", "Tobacco"));
        hsnList.add(createHsn("2403", 28, "Other manufactured tobacco and manufactured tobacco substitutes", "Tobacco"));
        hsnList.add(createHsn("2404", 28, "Products containing tobacco, nicotine, tobacco substitutes", "Tobacco"));
        
        // Chapter 25: Salt, Sulphur, Earths and Stone
        hsnList.add(createHsn("2501", 5, "Salt (including table salt and denatured salt)", "Minerals"));
        hsnList.add(createHsn("2502", 5, "Unroasted iron pyrites", "Minerals"));
        hsnList.add(createHsn("2503", 5, "Sulphur of all kinds", "Minerals"));
        hsnList.add(createHsn("2504", 5, "Natural graphite", "Minerals"));
        hsnList.add(createHsn("2505", 5, "Natural sands of all kinds", "Minerals"));
        hsnList.add(createHsn("2506", 5, "Quartz (other than natural sands)", "Minerals"));
        hsnList.add(createHsn("2507", 5, "Kaolin and other kaolinic clays", "Minerals"));
        hsnList.add(createHsn("2508", 5, "Other clays, andalusite, kyanite, sillimanite", "Minerals"));
        hsnList.add(createHsn("2509", 5, "Chalk", "Minerals"));
        hsnList.add(createHsn("2510", 5, "Natural calcium phosphates", "Minerals"));
        hsnList.add(createHsn("2511", 5, "Natural barium sulphate, carbonate", "Minerals"));
        hsnList.add(createHsn("2512", 5, "Siliceous fossil meals", "Minerals"));
        hsnList.add(createHsn("2513", 5, "Pumice stone, emery, natural corundum", "Minerals"));
        hsnList.add(createHsn("2514", 5, "Slate, whether or not roughly trimmed", "Minerals"));
        hsnList.add(createHsn("2515", 12, "Marble, travertine, ecaussine and other calcareous stone", "Minerals"));
        hsnList.add(createHsn("2516", 12, "Granite, porphyry, basalt, sandstone", "Minerals"));
        hsnList.add(createHsn("2517", 18, "Pebbles, gravel, broken or crushed stone", "Minerals"));
        hsnList.add(createHsn("2518", 18, "Dolomite, whether or not calcined", "Minerals"));
        hsnList.add(createHsn("2519", 18, "Natural magnesium carbonate, magnesite, fused magnesia", "Minerals"));
        hsnList.add(createHsn("2520", 18, "Gypsum; anhydrite", "Minerals"));
        hsnList.add(createHsn("2521", 18, "Limestone flux; limestone and other calcareous stone", "Minerals"));
        hsnList.add(createHsn("2522", 18, "Quicklime, slaked lime and hydraulic lime", "Minerals"));
        hsnList.add(createHsn("2523", 28, "Portland cement, aluminous cement, slag cement", "Construction"));
        hsnList.add(createHsn("2524", 18, "Asbestos", "Minerals"));
        hsnList.add(createHsn("2525", 18, "Mica, including splittings and mica waste", "Minerals"));
        hsnList.add(createHsn("2526", 18, "Natural steatite, whether or not roughly trimmed or cut", "Minerals"));
        hsnList.add(createHsn("2528", 18, "Natural borates and concentrates", "Minerals"));
        hsnList.add(createHsn("2529", 18, "Feldspar, leucite, nepheline and nepheline syenite", "Minerals"));
        hsnList.add(createHsn("2530", 18, "Mineral substances not elsewhere specified", "Minerals"));
        
        // Chapter 26: Ores, Slag and Ash
        hsnList.add(createHsn("2601", 5, "Iron ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2602", 5, "Manganese ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2603", 5, "Copper ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2604", 5, "Nickel ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2605", 5, "Cobalt ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2606", 5, "Aluminium ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2607", 5, "Lead ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2608", 5, "Zinc ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2609", 5, "Tin ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2610", 5, "Chromium ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2611", 5, "Tungsten ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2612", 5, "Uranium or thorium ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2613", 5, "Molybdenum ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2614", 5, "Titanium ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2615", 5, "Niobium, tantalum, vanadium or zirconium ores", "Minerals"));
        hsnList.add(createHsn("2616", 5, "Precious metal ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2617", 5, "Other ores and concentrates", "Minerals"));
        hsnList.add(createHsn("2618", 5, "Granulated slag from the manufacture of iron or steel", "Minerals"));
        hsnList.add(createHsn("2619", 5, "Slag, dross, scalings from manufacture of iron or steel", "Minerals"));
        hsnList.add(createHsn("2620", 5, "Ash and residues containing metals or metallic compounds", "Minerals"));
        hsnList.add(createHsn("2621", 5, "Other slag and ash, including seaweed ash", "Minerals"));
        
        // Chapter 27: Mineral Fuels, Oils, Waxes
        hsnList.add(createHsn("2701", 5, "Coal, briquettes, ovoids and similar solid fuels", "Petroleum"));
        hsnList.add(createHsn("2702", 5, "Lignite, whether or not agglomerated", "Petroleum"));
        hsnList.add(createHsn("2703", 5, "Peat (including peat litter)", "Petroleum"));
        hsnList.add(createHsn("2704", 5, "Coke and semi-coke of coal, lignite or peat", "Petroleum"));
        hsnList.add(createHsn("2705", 5, "Coal gas, water gas, producer gas and similar gases", "Petroleum"));
        hsnList.add(createHsn("2706", 5, "Tar distilled from coal, lignite or peat", "Petroleum"));
        hsnList.add(createHsn("2707", 18, "Oils and other products of the distillation of coal tar", "Petroleum"));
        hsnList.add(createHsn("2708", 18, "Pitch and pitch coke, obtained from coal tar", "Petroleum"));
        hsnList.add(createHsn("2709", 18, "Petroleum oils and oils obtained from bituminous minerals, crude", "Petroleum"));
        hsnList.add(createHsn("2710", 18, "Petroleum oils and oils from bituminous minerals (not crude)", "Petroleum"));
        hsnList.add(createHsn("2711", 18, "Petroleum gases and other gaseous hydrocarbons", "Petroleum"));
        hsnList.add(createHsn("2712", 18, "Petroleum jelly, paraffin wax, micro-crystalline wax", "Petroleum"));
        hsnList.add(createHsn("2713", 18, "Petroleum coke, petroleum bitumen and other residues", "Petroleum"));
        hsnList.add(createHsn("2714", 18, "Bitumen and asphalt, natural; bituminous shale and tar sands", "Petroleum"));
        hsnList.add(createHsn("2715", 18, "Bituminous mixtures based on natural asphalt or bitumen", "Petroleum"));
        hsnList.add(createHsn("2716", 18, "Electrical energy", "Petroleum"));
        
        // Pharmaceuticals
        hsnList.add(createHsn("3004", 12, "Medicaments (formulated)", "Pharma"));
        hsnList.add(createHsn("3006", 12, "Surgical, pharma goods", "Pharma"));

        // Cosmetics & Personal Care
        hsnList.add(createHsn("3303", 18, "Perfumes, toilet waters", "Cosmetics"));
        hsnList.add(createHsn("3304", 18, "Beauty / make-up", "Cosmetics"));
        hsnList.add(createHsn("3305", 18, "Hair preparations", "Cosmetics"));
        hsnList.add(createHsn("3401", 18, "Soap, organic surface-active", "Personal Care"));
        hsnList.add(createHsn("3402", 18, "Detergents", "Personal Care"));
        
        // Chapter 28: Inorganic Chemicals
        hsnList.add(createHsn("2801", 18, "Fluorine, chlorine, bromine and iodine", "Chemicals"));
        hsnList.add(createHsn("2802", 18, "Sulphur, sublimed or precipitated; colloidal sulphur", "Chemicals"));
        hsnList.add(createHsn("2803", 18, "Carbon (carbon blacks and other forms of carbon)", "Chemicals"));
        hsnList.add(createHsn("2804", 18, "Hydrogen, rare gases and other non-metals", "Chemicals"));
        hsnList.add(createHsn("2805", 18, "Alkali or alkaline-earth metals; rare-earth metals", "Chemicals"));
        hsnList.add(createHsn("2806", 18, "Hydrogen chloride (hydrochloric acid); chlorosulphuric acid", "Chemicals"));
        hsnList.add(createHsn("2807", 18, "Sulphuric acid; oleum", "Chemicals"));
        hsnList.add(createHsn("2808", 18, "Nitric acid; sulphonitric acids", "Chemicals"));
        hsnList.add(createHsn("2809", 18, "Diphosphorus pentaoxide; phosphoric acid; polyphosphoric acids", "Chemicals"));
        hsnList.add(createHsn("2810", 18, "Oxides of boron; boric acids", "Chemicals"));
        hsnList.add(createHsn("2811", 18, "Other inorganic acids and other inorganic oxygen compounds", "Chemicals"));
        hsnList.add(createHsn("2812", 18, "Halides and halide oxides of non-metals", "Chemicals"));
        hsnList.add(createHsn("2813", 18, "Sulphides of non-metals; commercial phosphorus trisulphide", "Chemicals"));
        hsnList.add(createHsn("2814", 18, "Ammonia, anhydrous or in aqueous solution", "Chemicals"));
        hsnList.add(createHsn("2815", 18, "Sodium hydroxide (caustic soda); potassium hydroxide (caustic potash)", "Chemicals"));
        hsnList.add(createHsn("2816", 18, "Hydroxide and peroxide of magnesium; oxides, hydroxides", "Chemicals"));
        hsnList.add(createHsn("2817", 18, "Zinc oxide; zinc peroxide", "Chemicals"));
        hsnList.add(createHsn("2818", 18, "Artificial corundum, whether or not chemically defined", "Chemicals"));
        hsnList.add(createHsn("2819", 18, "Chromium oxides and hydroxides", "Chemicals"));
        hsnList.add(createHsn("2820", 18, "Manganese oxides", "Chemicals"));
        hsnList.add(createHsn("2821", 18, "Iron oxides and hydroxides; earth colours", "Chemicals"));
        hsnList.add(createHsn("2822", 18, "Cobalt oxides and hydroxides; commercial cobalt oxides", "Chemicals"));
        hsnList.add(createHsn("2823", 18, "Titanium oxides", "Chemicals"));
        hsnList.add(createHsn("2824", 18, "Lead oxides; red lead and orange lead", "Chemicals"));
        hsnList.add(createHsn("2825", 18, "Hydrazine and hydroxylamine and their inorganic salts", "Chemicals"));
        hsnList.add(createHsn("2826", 18, "Fluorides; fluorosilicates, fluoroaluminates and other complex fluorine salts", "Chemicals"));
        hsnList.add(createHsn("2827", 18, "Chlorides, chloride oxides and chloride hydroxides", "Chemicals"));
        hsnList.add(createHsn("2828", 18, "Hypochlorites; commercial calcium hypochlorite", "Chemicals"));
        hsnList.add(createHsn("2829", 18, "Chlorates and perchlorates; bromates and perbromates", "Chemicals"));
        hsnList.add(createHsn("2830", 18, "Sulphides; polysulphides", "Chemicals"));
        hsnList.add(createHsn("2831", 18, "Dithionites and sulphoxylates", "Chemicals"));
        hsnList.add(createHsn("2832", 18, "Sulphites; thiosulphates", "Chemicals"));
        hsnList.add(createHsn("2833", 18, "Sulphates; alums; peroxosulphates (persulphates)", "Chemicals"));
        hsnList.add(createHsn("2834", 18, "Nitrites; nitrates", "Chemicals"));
        hsnList.add(createHsn("2835", 18, "Phosphinates (hypophosphites), phosphonates (phosphites) and phosphates", "Chemicals"));
        hsnList.add(createHsn("2836", 18, "Carbonates; peroxocarbonates (percarbonates)", "Chemicals"));
        hsnList.add(createHsn("2837", 18, "Cyanides, cyanide oxides and complex cyanides", "Chemicals"));
        hsnList.add(createHsn("2838", 18, "Fulminates, cyanates and thiocyanates", "Chemicals"));
        hsnList.add(createHsn("2839", 18, "Silicates; commercial alkali metal silicates", "Chemicals"));
        hsnList.add(createHsn("2840", 18, "Borates; peroxoborates (perborates)", "Chemicals"));
        hsnList.add(createHsn("2841", 18, "Salts of oxometallic or peroxometallic acids", "Chemicals"));
        hsnList.add(createHsn("2842", 18, "Other salts of inorganic acids or peroxoacids", "Chemicals"));
        hsnList.add(createHsn("2843", 18, "Colloidal precious metals; precious metal compounds", "Chemicals"));
        hsnList.add(createHsn("2844", 18, "Radioactive chemical elements and radioactive isotopes", "Chemicals"));
        hsnList.add(createHsn("2845", 18, "Isotopes other than those of heading 2844", "Chemicals"));
        hsnList.add(createHsn("2846", 18, "Compounds, inorganic or organic, of rare-earth metals", "Chemicals"));
        hsnList.add(createHsn("2847", 18, "Hydrogen peroxide, whether or not solidified with urea", "Chemicals"));
        hsnList.add(createHsn("2848", 18, "Phosphides, whether or not chemically defined", "Chemicals"));
        hsnList.add(createHsn("2849", 18, "Carbides, whether or not chemically defined", "Chemicals"));
        hsnList.add(createHsn("2850", 18, "Hydrides, nitrides, azides, silicides and borides", "Chemicals"));
        hsnList.add(createHsn("2851", 18, "Other inorganic compounds", "Chemicals"));
        
        // Chapter 29: Organic Chemicals
        hsnList.add(createHsn("2901", 18, "Acyclic hydrocarbons", "Chemicals"));
        hsnList.add(createHsn("2902", 18, "Cyclic hydrocarbons", "Chemicals"));
        hsnList.add(createHsn("2903", 18, "Halogenated derivatives of hydrocarbons", "Chemicals"));
        hsnList.add(createHsn("2904", 18, "Sulphonated, nitrated or nitrosated derivatives of hydrocarbons", "Chemicals"));
        hsnList.add(createHsn("2905", 18, "Acyclic alcohols and their halogenated derivatives", "Chemicals"));
        hsnList.add(createHsn("2906", 18, "Cyclic alcohols and their halogenated, sulphonated derivatives", "Chemicals"));
        hsnList.add(createHsn("2907", 18, "Phenols; phenol-alcohols", "Chemicals"));
        hsnList.add(createHsn("2908", 18, "Halogenated, sulphonated, nitrated or nitrosated derivatives of phenols", "Chemicals"));
        hsnList.add(createHsn("2909", 18, "Ethers, ether-alcohols, ether-phenols", "Chemicals"));
        hsnList.add(createHsn("2910", 18, "Epoxides, epoxyalcohols, epoxyphenols", "Chemicals"));
        hsnList.add(createHsn("2911", 18, "Acetals and hemiacetals", "Chemicals"));
        hsnList.add(createHsn("2912", 18, "Aldehydes, whether or not with other oxygen function", "Chemicals"));
        hsnList.add(createHsn("2913", 18, "Halogenated, sulphonated, nitrated or nitrosated derivatives of aldehydes", "Chemicals"));
        hsnList.add(createHsn("2914", 18, "Ketones and quinones", "Chemicals"));
        hsnList.add(createHsn("2915", 18, "Saturated acyclic monocarboxylic acids", "Chemicals"));
        hsnList.add(createHsn("2916", 18, "Unsaturated acyclic monocarboxylic acids", "Chemicals"));
        hsnList.add(createHsn("2917", 18, "Polycarboxylic acids", "Chemicals"));
        hsnList.add(createHsn("2918", 18, "Carboxylic acids with additional oxygen function", "Chemicals"));
        hsnList.add(createHsn("2919", 18, "Phosphoric esters and their salts", "Chemicals"));
        hsnList.add(createHsn("2920", 18, "Esters of other inorganic acids and their salts", "Chemicals"));
        hsnList.add(createHsn("2921", 18, "Amine-function compounds", "Chemicals"));
        hsnList.add(createHsn("2922", 18, "Oxygen-function amino-compounds", "Chemicals"));
        hsnList.add(createHsn("2923", 18, "Quaternary ammonium salts and hydroxides", "Chemicals"));
        hsnList.add(createHsn("2924", 18, "Carboxyamide-function compounds; amide-function compounds of carbonic acid", "Chemicals"));
        hsnList.add(createHsn("2925", 18, "Carboxyimide-function compounds (including saccharin)", "Chemicals"));
        hsnList.add(createHsn("2926", 18, "Nitrile-function compounds", "Chemicals"));
        hsnList.add(createHsn("2927", 18, "Diazo-, azo- or azoxy-compounds", "Chemicals"));
        hsnList.add(createHsn("2928", 18, "Organic derivatives of hydrazine or of hydroxylamine", "Chemicals"));
        hsnList.add(createHsn("2929", 18, "Compounds with other nitrogen function", "Chemicals"));
        hsnList.add(createHsn("2930", 18, "Organo-sulphur compounds", "Chemicals"));
        hsnList.add(createHsn("2931", 18, "Other organo-inorganic compounds", "Chemicals"));
        hsnList.add(createHsn("2932", 18, "Heterocyclic compounds with oxygen hetero-atom(s) only", "Chemicals"));
        hsnList.add(createHsn("2933", 18, "Heterocyclic compounds with nitrogen hetero-atom(s) only", "Chemicals"));
        hsnList.add(createHsn("2934", 18, "Nucleic acids and their salts; other heterocyclic compounds", "Chemicals"));
        hsnList.add(createHsn("2935", 18, "Sulphonamides", "Chemicals"));
        hsnList.add(createHsn("2936", 18, "Provitamins and vitamins, natural or reproduced by synthesis", "Chemicals"));
        hsnList.add(createHsn("2937", 18, "Hormones, prostaglandins, thromboxanes and leukotrienes", "Chemicals"));
        hsnList.add(createHsn("2938", 18, "Glycosides, natural or reproduced by synthesis", "Chemicals"));
        hsnList.add(createHsn("2939", 18, "Vegetable alkaloids, natural or reproduced by synthesis", "Chemicals"));
        hsnList.add(createHsn("2940", 18, "Sugars, chemically pure, other than sucrose, lactose, maltose, glucose", "Chemicals"));
        hsnList.add(createHsn("2941", 18, "Antibiotics", "Chemicals"));
        hsnList.add(createHsn("2942", 18, "Other organic compounds", "Chemicals"));
        
        // Chapter 30: Pharmaceutical Products
        hsnList.add(createHsn("3001", 12, "Glands and other organs for organo-therapeutic uses", "Pharma"));
        hsnList.add(createHsn("3002", 12, "Human blood; animal blood prepared for therapeutic uses", "Pharma"));
        hsnList.add(createHsn("3003", 12, "Medicaments consisting of two or more constituents", "Pharma"));
        hsnList.add(createHsn("3004", 12, "Medicaments consisting of mixed or unmixed products", "Pharma"));
        hsnList.add(createHsn("3005", 12, "Wadding, gauze, bandages and similar articles", "Pharma"));
        hsnList.add(createHsn("3006", 12, "Pharmaceutical goods specified in Note 4", "Pharma"));
        
        // Chapter 31: Fertilisers
        hsnList.add(createHsn("3101", 5, "Animal or vegetable fertilisers", "Fertilisers"));
        hsnList.add(createHsn("3102", 5, "Mineral or chemical fertilisers, nitrogenous", "Fertilisers"));
        hsnList.add(createHsn("3103", 5, "Mineral or chemical fertilisers, phosphatic", "Fertilisers"));
        hsnList.add(createHsn("3104", 5, "Mineral or chemical fertilisers, potassic", "Fertilisers"));
        hsnList.add(createHsn("3105", 5, "Mineral or chemical fertilisers containing two or three fertilising elements", "Fertilisers"));
        
        // Chapter 32: Tanning or Dyeing Extracts
        hsnList.add(createHsn("3201", 18, "Tanning extracts of vegetable origin", "Chemicals"));
        hsnList.add(createHsn("3202", 18, "Synthetic organic tanning substances", "Chemicals"));
        hsnList.add(createHsn("3203", 18, "Colouring matter of vegetable or animal origin", "Chemicals"));
        hsnList.add(createHsn("3204", 18, "Synthetic organic colouring matter", "Chemicals"));
        hsnList.add(createHsn("3205", 18, "Colour lakes; preparations based on colour lakes", "Chemicals"));
        hsnList.add(createHsn("3206", 18, "Other colouring matter", "Chemicals"));
        hsnList.add(createHsn("3207", 18, "Prepared pigments, opacifiers, colours and similar preparations", "Chemicals"));
        hsnList.add(createHsn("3208", 18, "Paints and varnishes", "Chemicals"));
        hsnList.add(createHsn("3209", 18, "Paints and varnishes based on synthetic polymers", "Chemicals"));
        hsnList.add(createHsn("3210", 18, "Other paints and varnishes", "Chemicals"));
        hsnList.add(createHsn("3211", 18, "Prepared driers", "Chemicals"));
        hsnList.add(createHsn("3212", 18, "Pigments for paint manufacturers", "Chemicals"));
        hsnList.add(createHsn("3213", 18, "Artists, students or signboard painters colours", "Chemicals"));
        hsnList.add(createHsn("3214", 18, "Glaziers putty, grafting putty, resin cements", "Chemicals"));
        hsnList.add(createHsn("3215", 18, "Printing ink, writing or drawing ink", "Chemicals"));
        
        // Chapter 33: Essential Oils and Resinoids
        hsnList.add(createHsn("3301", 18, "Essential oils (terpeneless or not)", "Cosmetics"));
        hsnList.add(createHsn("3302", 18, "Mixtures of odoriferous substances", "Cosmetics"));
        hsnList.add(createHsn("3303", 18, "Perfumes and toilet waters", "Cosmetics"));
        hsnList.add(createHsn("3304", 18, "Beauty or make-up preparations", "Cosmetics"));
        hsnList.add(createHsn("3305", 18, "Preparations for use on the hair", "Cosmetics"));
        hsnList.add(createHsn("3306", 18, "Preparations for oral or dental hygiene", "Cosmetics"));
        hsnList.add(createHsn("3307", 18, "Pre-shave, shaving or after-shave preparations", "Cosmetics"));
        
        // Chapter 34: Soap, Waxes, Polishes
        hsnList.add(createHsn("3401", 18, "Soap; organic surface-active products", "Personal Care"));
        hsnList.add(createHsn("3402", 18, "Organic surface-active agents", "Personal Care"));
        hsnList.add(createHsn("3403", 18, "Lubricating preparations", "Personal Care"));
        hsnList.add(createHsn("3404", 18, "Artificial waxes and prepared waxes", "Personal Care"));
        hsnList.add(createHsn("3405", 18, "Polishes and creams", "Personal Care"));
        hsnList.add(createHsn("3406", 18, "Candles, tapers and the like", "Personal Care"));
        hsnList.add(createHsn("3407", 18, "Modelling pastes", "Personal Care"));
        
        // Chapter 35: Albuminoidal Substances
        hsnList.add(createHsn("3501", 18, "Casein, caseinates and other casein derivatives", "Chemicals"));
        hsnList.add(createHsn("3502", 18, "Albumins, albuminates and other albumin derivatives", "Chemicals"));
        hsnList.add(createHsn("3503", 18, "Gelatin and gelatin derivatives", "Chemicals"));
        hsnList.add(createHsn("3504", 18, "Peptones and their derivatives", "Chemicals"));
        hsnList.add(createHsn("3505", 18, "Dextrins and other modified starches", "Chemicals"));
        hsnList.add(createHsn("3506", 18, "Prepared glues and other prepared adhesives", "Chemicals"));
        hsnList.add(createHsn("3507", 18, "Enzymes; prepared enzymes not elsewhere specified", "Chemicals"));
        
        // Chapter 36: Explosives
        hsnList.add(createHsn("3601", 18, "Propellant powders", "Explosives"));
        hsnList.add(createHsn("3602", 18, "Prepared explosives", "Explosives"));
        hsnList.add(createHsn("3603", 18, "Safety fuses; detonating fuses", "Explosives"));
        hsnList.add(createHsn("3604", 18, "Fireworks, signalling flares", "Explosives"));
        hsnList.add(createHsn("3605", 18, "Matches, other than pyrotechnic articles", "Explosives"));
        hsnList.add(createHsn("3606", 18, "Ferro-cerium and other pyrophoric alloys", "Explosives"));
        
        // Chapter 37: Photographic or Cinematographic Goods
        hsnList.add(createHsn("3701", 18, "Photographic plates and film in the flat", "Photography"));
        hsnList.add(createHsn("3702", 18, "Photographic film in rolls", "Photography"));
        hsnList.add(createHsn("3703", 18, "Photographic paper, paperboard and textiles", "Photography"));
        hsnList.add(createHsn("3704", 18, "Photographic plates, film, paper, paperboard and textiles", "Photography"));
        hsnList.add(createHsn("3705", 18, "Photographic plates and film", "Photography"));
        hsnList.add(createHsn("3706", 18, "Cinematographic film, exposed and developed", "Photography"));
        hsnList.add(createHsn("3707", 18, "Chemical preparations for photographic uses", "Photography"));
        
        // Chapter 38: Miscellaneous Chemical Products
        hsnList.add(createHsn("3801", 18, "Artificial graphite; colloidal or semi-colloidal graphite", "Chemicals"));
        hsnList.add(createHsn("3802", 18, "Activated carbon; activated natural mineral products", "Chemicals"));
        hsnList.add(createHsn("3803", 18, "Tall oil, whether or not refined", "Chemicals"));
        hsnList.add(createHsn("3804", 18, "Residual lyes from the manufacture of wood pulp", "Chemicals"));
        hsnList.add(createHsn("3805", 18, "Gum, wood or sulphate turpentine", "Chemicals"));
        hsnList.add(createHsn("3806", 18, "Rosin and resin acids", "Chemicals"));
        hsnList.add(createHsn("3807", 18, "Wood tar; wood tar oils", "Chemicals"));
        hsnList.add(createHsn("3808", 18, "Insecticides, rodenticides, fungicides", "Chemicals"));
        hsnList.add(createHsn("3809", 18, "Finishing agents, dye carriers", "Chemicals"));
        hsnList.add(createHsn("3810", 18, "Pickling preparations for metal surfaces", "Chemicals"));
        hsnList.add(createHsn("3811", 18, "Anti-knock preparations, oxidation inhibitors", "Chemicals"));
        hsnList.add(createHsn("3812", 18, "Prepared rubber accelerators", "Chemicals"));
        hsnList.add(createHsn("3813", 18, "Preparations and charges for fire-extinguishers", "Chemicals"));
        hsnList.add(createHsn("3814", 18, "Organic composite solvents and thinners", "Chemicals"));
        hsnList.add(createHsn("3815", 18, "Reaction initiators, reaction accelerators", "Chemicals"));
        hsnList.add(createHsn("3816", 18, "Refractory cements, mortars, concretes", "Chemicals"));
        hsnList.add(createHsn("3817", 18, "Mixed alkylbenzenes and mixed alkylnaphthalenes", "Chemicals"));
        hsnList.add(createHsn("3818", 18, "Chemical elements doped for use in electronics", "Chemicals"));
        hsnList.add(createHsn("3819", 18, "Hydraulic brake fluids", "Chemicals"));
        hsnList.add(createHsn("3820", 18, "Anti-freezing preparations and prepared de-icing fluids", "Chemicals"));
        hsnList.add(createHsn("3821", 18, "Prepared culture media for the development of micro-organisms", "Chemicals"));
        hsnList.add(createHsn("3822", 18, "Diagnostic or laboratory reagents", "Chemicals"));
        hsnList.add(createHsn("3823", 18, "Industrial monocarboxylic fatty acids", "Chemicals"));
        hsnList.add(createHsn("3824", 18, "Prepared binders for foundry moulds or cores", "Chemicals"));
        hsnList.add(createHsn("3825", 18, "Residual products of the chemical or allied industries", "Chemicals"));
        hsnList.add(createHsn("3826", 18, "Biodiesel and mixtures thereof", "Chemicals"));

        // Chapter 39: Plastics and Articles Thereof
        hsnList.add(createHsn("3901", 18, "Polymers of ethylene, in primary forms", "Plastics"));
        hsnList.add(createHsn("3902", 18, "Polymers of propylene or of other olefins", "Plastics"));
        hsnList.add(createHsn("3903", 18, "Polymers of styrene, in primary forms", "Plastics"));
        hsnList.add(createHsn("3904", 18, "Polymers of vinyl chloride or of other halogenated olefins", "Plastics"));
        hsnList.add(createHsn("3905", 18, "Polymers of vinyl acetate or of other vinyl esters", "Plastics"));
        hsnList.add(createHsn("3906", 18, "Acrylic polymers in primary forms", "Plastics"));
        hsnList.add(createHsn("3907", 18, "Polyacetals, other polyethers and epoxide resins", "Plastics"));
        hsnList.add(createHsn("3908", 18, "Polyamides in primary forms", "Plastics"));
        hsnList.add(createHsn("3909", 18, "Amino-resins, phenolic resins and polyurethanes", "Plastics"));
        hsnList.add(createHsn("3910", 18, "Silicones in primary forms", "Plastics"));
        hsnList.add(createHsn("3911", 18, "Petroleum resins, coumarone-indene resins", "Plastics"));
        hsnList.add(createHsn("3912", 18, "Cellulose and its chemical derivatives", "Plastics"));
        hsnList.add(createHsn("3913", 18, "Natural polymers and modified natural polymers", "Plastics"));
        hsnList.add(createHsn("3914", 18, "Ion-exchangers based on polymers", "Plastics"));
        hsnList.add(createHsn("3915", 18, "Waste, parings and scrap, of plastics", "Plastics"));
        hsnList.add(createHsn("3916", 18, "Monofilament, cross-sectional dimension >1mm", "Plastics"));
        hsnList.add(createHsn("3917", 18, "Tubes, pipes and hoses, and fittings thereof", "Plastics"));
        hsnList.add(createHsn("3918", 18, "Floor coverings of plastics", "Plastics"));
        hsnList.add(createHsn("3919", 18, "Self-adhesive plates, sheets, film of plastics", "Plastics"));
        hsnList.add(createHsn("39199090", 18, "BOPP Jumbo Roll (Self-adhesive) 288 x 1000 - Self-adhesive plates, sheets, film, foil, tape, strip of plastics in rolls", "Plastics"));
        hsnList.add(createHsn("3920", 18, "Other plates, sheets, film, foil and strip of plastics (non-self-adhesive)", "Plastics"));
        hsnList.add(createHsn("3921", 18, "Other plates, sheets, film, foil and strip of plastics", "Plastics"));
        hsnList.add(createHsn("3922", 18, "Baths, shower-baths, sinks, wash-basins", "Plastics"));
        hsnList.add(createHsn("3923", 18, "Articles for the conveyance or packing of goods", "Plastics"));
        hsnList.add(createHsn("3924", 18, "Tableware, kitchenware, other household articles", "Plastics"));
        hsnList.add(createHsn("3925", 18, "Builders ware of plastics", "Plastics"));
        hsnList.add(createHsn("3926", 18, "Other articles of plastics", "Plastics"));
        
        // Chapter 40: Rubber and Articles Thereof
        hsnList.add(createHsn("4001", 18, "Natural rubber, balata, gutta-percha", "Rubber"));
        hsnList.add(createHsn("4002", 18, "Synthetic rubber and factice derived from oils", "Rubber"));
        hsnList.add(createHsn("4003", 18, "Reclaimed rubber in primary forms or in plates", "Rubber"));
        hsnList.add(createHsn("4004", 18, "Waste, parings and scrap of rubber", "Rubber"));
        hsnList.add(createHsn("4005", 18, "Compounded rubber, unvulcanised, in primary forms", "Rubber"));
        hsnList.add(createHsn("4006", 18, "Forms of unvulcanised rubber", "Rubber"));
        hsnList.add(createHsn("4007", 18, "Vulcanised rubber thread and cord", "Rubber"));
        hsnList.add(createHsn("4008", 18, "Plates, sheets, strip, rods and profile shapes of vulcanised rubber", "Rubber"));
        hsnList.add(createHsn("4009", 18, "Tubes, pipes and hoses of vulcanised rubber", "Rubber"));
        hsnList.add(createHsn("4010", 18, "Conveyor or transmission belts or belting", "Rubber"));
        hsnList.add(createHsn("4011", 28, "New pneumatic tyres, of rubber", "Rubber"));
        hsnList.add(createHsn("4012", 18, "Retreaded or used pneumatic tyres", "Rubber"));
        hsnList.add(createHsn("4013", 18, "Inner tubes, of rubber", "Rubber"));
        hsnList.add(createHsn("4014", 12, "Hygienic or pharmaceutical articles of rubber", "Rubber"));
        hsnList.add(createHsn("4015", 18, "Articles of apparel and clothing accessories", "Rubber"));
        hsnList.add(createHsn("4016", 18, "Other articles of vulcanised rubber", "Rubber"));
        hsnList.add(createHsn("4017", 18, "Hard rubber and articles thereof", "Rubber"));
        
        // Chapter 41: Raw Hides and Skins and Leather
        hsnList.add(createHsn("4101", 0, "Raw hides and skins of bovine animals", "Leather"));
        hsnList.add(createHsn("4102", 0, "Raw skins of sheep or lambs", "Leather"));
        hsnList.add(createHsn("4103", 0, "Other raw hides and skins", "Leather"));
        hsnList.add(createHsn("4104", 0, "Tanned or crust hides and skins of bovine animals", "Leather"));
        hsnList.add(createHsn("4105", 0, "Tanned or crust skins of sheep or lambs", "Leather"));
        hsnList.add(createHsn("4106", 0, "Tanned or crust hides and skins of other animals", "Leather"));
        hsnList.add(createHsn("4107", 0, "Leather of bovine animals, without hair on", "Leather"));
        hsnList.add(createHsn("4108", 0, "Chamois leather", "Leather"));
        hsnList.add(createHsn("4109", 0, "Patent leather and metallised leather", "Leather"));
        hsnList.add(createHsn("4110", 0, "Parings and other waste of leather", "Leather"));
        hsnList.add(createHsn("4111", 0, "Composition leather with a basis of leather or leather fibre", "Leather"));
        
        // Chapter 42: Articles of Leather
        hsnList.add(createHsn("4201", 18, "Saddlery and harness for any animal", "Leather"));
        hsnList.add(createHsn("4202", 18, "Trunks, suitcases, vanity-cases, executive-cases, briefcases", "Leather"));
        hsnList.add(createHsn("4203", 18, "Articles of apparel and clothing accessories, of leather", "Leather"));
        hsnList.add(createHsn("4204", 18, "Articles of leather used in machinery or mechanical appliances", "Leather"));
        hsnList.add(createHsn("4205", 18, "Other articles of leather", "Leather"));
        hsnList.add(createHsn("4206", 18, "Articles of gut, of goldbeater's skin", "Leather"));
        
        // Chapter 43: Furskins and Artificial Fur
        hsnList.add(createHsn("4301", 0, "Raw furskins", "Leather"));
        hsnList.add(createHsn("4302", 0, "Tanned or dressed furskins", "Leather"));
        hsnList.add(createHsn("4303", 5, "Articles of apparel, clothing accessories and other articles of furskin", "Leather"));
        hsnList.add(createHsn("4304", 5, "Artificial fur and articles thereof", "Leather"));
        
        // Chapter 44: Wood and Articles of Wood
        hsnList.add(createHsn("4401", 5, "Fuel wood, in logs, in billets, in twigs, in faggots", "Wood"));
        hsnList.add(createHsn("4402", 5, "Wood charcoal", "Wood"));
        hsnList.add(createHsn("4403", 5, "Wood in the rough, whether or not stripped of bark", "Wood"));
        hsnList.add(createHsn("4404", 5, "Hoopwood; split poles; pickets and stakes of wood", "Wood"));
        hsnList.add(createHsn("4405", 5, "Wood wool; wood flour", "Wood"));
        hsnList.add(createHsn("4406", 5, "Railway or tramway sleepers of wood", "Wood"));
        hsnList.add(createHsn("4407", 5, "Wood sawn or chipped lengthwise, sliced or peeled", "Wood"));
        hsnList.add(createHsn("4408", 5, "Sheets for veneering, plywood, etc.", "Wood"));
        hsnList.add(createHsn("4409", 5, "Wood continuously shaped along any of its edges or faces", "Wood"));
        hsnList.add(createHsn("4410", 12, "Particle board, oriented strand board and similar board", "Wood"));
        hsnList.add(createHsn("4411", 12, "Fibreboard of wood or other ligneous materials", "Wood"));
        hsnList.add(createHsn("4412", 18, "Plywood, veneered panels and similar laminated wood", "Wood"));
        hsnList.add(createHsn("4413", 18, "Densified wood, in blocks, plates, strips or profile shapes", "Wood"));
        hsnList.add(createHsn("4414", 12, "Wooden frames for paintings, photographs, mirrors or similar objects", "Wood"));
        hsnList.add(createHsn("4415", 12, "Packing cases, boxes, crates, drums and similar packings", "Wood"));
        hsnList.add(createHsn("4416", 12, "Casks, barrels, vats, tubs and other coopers products", "Wood"));
        hsnList.add(createHsn("4417", 12, "Tools, tool bodies, tool handles, broom or brush bodies", "Wood"));
        hsnList.add(createHsn("4418", 18, "Builders joinery and carpentry of wood", "Wood"));
        hsnList.add(createHsn("4419", 12, "Tableware and kitchenware, of wood", "Wood"));
        hsnList.add(createHsn("4420", 12, "Wood marquetry and inlaid wood; caskets and cases for jewellery", "Wood"));
        hsnList.add(createHsn("4421", 18, "Other articles of wood", "Wood"));
        
        // Chapter 45: Cork and Articles of Cork
        hsnList.add(createHsn("4501", 5, "Natural cork, raw or simply prepared", "Wood"));
        hsnList.add(createHsn("4502", 5, "Natural cork, debacked or roughly squared", "Wood"));
        hsnList.add(createHsn("4503", 12, "Articles of natural cork", "Wood"));
        hsnList.add(createHsn("4504", 18, "Agglomerated cork and articles thereof", "Wood"));
        
        // Chapter 46: Manufactures of Straw, Esparto, etc.
        hsnList.add(createHsn("4601", 5, "Plaits and similar products of plaiting materials", "Wood"));
        hsnList.add(createHsn("4602", 12, "Basketwork, wickerwork and other articles", "Wood"));
        
        // Chapter 47: Pulp of Wood, Waste and Scrap of Paper
        hsnList.add(createHsn("4701", 5, "Mechanical wood pulp", "Paper"));
        hsnList.add(createHsn("4702", 5, "Chemical wood pulp, dissolving grades", "Paper"));
        hsnList.add(createHsn("4703", 5, "Chemical wood pulp, soda or sulphate", "Paper"));
        hsnList.add(createHsn("4704", 5, "Chemical wood pulp, sulphite", "Paper"));
        hsnList.add(createHsn("4705", 5, "Wood pulp obtained by a combination of mechanical and chemical pulping processes", "Paper"));
        hsnList.add(createHsn("4706", 5, "Pulps of fibres derived from recovered paper or paperboard", "Paper"));
        hsnList.add(createHsn("4707", 5, "Recovered paper or paperboard", "Paper"));
        
        // Chapter 48: Paper and Paperboard
        hsnList.add(createHsn("4801", 5, "Newsprint, in rolls or sheets", "Paper"));
        hsnList.add(createHsn("4802", 12, "Uncoated paper and paperboard", "Paper"));
        hsnList.add(createHsn("4803", 12, "Toilet or facial tissue stock, towel or napkin stock", "Paper"));
        hsnList.add(createHsn("4804", 12, "Uncoated kraft paper and paperboard", "Paper"));
        hsnList.add(createHsn("4805", 12, "Other uncoated paper and paperboard", "Paper"));
        hsnList.add(createHsn("4806", 12, "Vegetable parchment, tracing papers and other glazed transparent papers", "Paper"));
        hsnList.add(createHsn("4807", 12, "Composite paper and paperboard", "Paper"));
        hsnList.add(createHsn("4808", 12, "Paper and paperboard, corrugated, creped, crinkled, embossed or perforated", "Paper"));
        hsnList.add(createHsn("4809", 12, "Carbon paper, self-copy paper and other copying or transfer papers", "Paper"));
        hsnList.add(createHsn("4810", 12, "Paper and paperboard, coated on one or both sides with kaolin", "Paper"));
        hsnList.add(createHsn("4811", 12, "Paper, paperboard, cellulose wadding and webs of cellulose fibres", "Paper"));
        hsnList.add(createHsn("4812", 12, "Filter blocks, slabs and plates, of paper pulp", "Paper"));
        hsnList.add(createHsn("4813", 12, "Cigarette paper", "Paper"));
        hsnList.add(createHsn("4814", 12, "Wallpaper and similar wall coverings", "Paper"));
        hsnList.add(createHsn("4816", 12, "Carbon paper, self-copy paper and other copying or transfer papers", "Paper"));
        hsnList.add(createHsn("4817", 12, "Envelopes, letter cards, plain postcards and correspondence cards", "Paper"));
        hsnList.add(createHsn("4818", 12, "Toilet paper and similar paper", "Paper"));
        hsnList.add(createHsn("4819", 12, "Cartons, boxes, cases, bags and other packing containers", "Paper"));
        hsnList.add(createHsn("4820", 12, "Registers, account books, note books, order books", "Paper"));
        hsnList.add(createHsn("4821", 12, "Paper or paperboard labels of all kinds", "Paper"));
        hsnList.add(createHsn("4822", 12, "Bobbins, spools, cops and similar supports", "Paper"));
        hsnList.add(createHsn("4823", 12, "Other paper, paperboard and articles of paper pulp", "Paper"));
        
        // Chapter 49: Printed Books, Newspapers, Pictures
        hsnList.add(createHsn("4901", 0, "Printed books, brochures, leaflets and similar printed matter", "Printing"));
        hsnList.add(createHsn("4902", 0, "Newspapers, journals and periodicals", "Printing"));
        hsnList.add(createHsn("4903", 0, "Children's picture, drawing or colouring books", "Printing"));
        hsnList.add(createHsn("4904", 0, "Music, printed or in manuscript", "Printing"));
        hsnList.add(createHsn("4905", 0, "Maps and hydrographic or similar charts of all kinds", "Printing"));
        hsnList.add(createHsn("4906", 0, "Plans and drawings for architectural, engineering, industrial, commercial", "Printing"));
        hsnList.add(createHsn("4907", 12, "Unused postage, revenue or similar stamps of current or new issue", "Printing"));
        hsnList.add(createHsn("4908", 12, "Transfers (decalcomanias)", "Printing"));
        hsnList.add(createHsn("4909", 12, "Printed or illustrated postcards; printed cards", "Printing"));
        hsnList.add(createHsn("4910", 12, "Calendars of any kind, printed, including calendar blocks", "Printing"));
        hsnList.add(createHsn("4911", 12, "Other printed matter, including pictures and photographs", "Printing"));

        // Chapter 50-63: TEXTILES AND TEXTILE ARTICLES
        // Chapter 50: Silk
        hsnList.add(createHsn("5001", 5, "Silk-worm cocoons suitable for reeling", "Textiles"));
        hsnList.add(createHsn("5002", 5, "Raw silk (not thrown)", "Textiles"));
        hsnList.add(createHsn("5003", 5, "Silk waste", "Textiles"));
        hsnList.add(createHsn("5004", 5, "Silk yarn (excluding yarn spun from silk waste)", "Textiles"));
        hsnList.add(createHsn("5005", 5, "Yarn spun from silk waste", "Textiles"));
        hsnList.add(createHsn("5006", 5, "Silk yarn and yarn spun from silk waste, put up for retail sale", "Textiles"));
        hsnList.add(createHsn("5007", 5, "Woven fabrics of silk or of silk waste", "Textiles"));
        
        // Chapter 51: Wool, Fine or Coarse Animal Hair
        hsnList.add(createHsn("5101", 5, "Wool, not carded or combed", "Textiles"));
        hsnList.add(createHsn("5102", 5, "Fine or coarse animal hair, not carded or combed", "Textiles"));
        hsnList.add(createHsn("5103", 5, "Waste of wool or of fine or coarse animal hair", "Textiles"));
        hsnList.add(createHsn("5104", 5, "Garnetted stock of wool or of fine or coarse animal hair", "Textiles"));
        hsnList.add(createHsn("5105", 5, "Wool and fine or coarse animal hair, carded or combed", "Textiles"));
        hsnList.add(createHsn("5106", 5, "Yarn of carded wool", "Textiles"));
        hsnList.add(createHsn("5107", 5, "Yarn of combed wool", "Textiles"));
        hsnList.add(createHsn("5108", 5, "Yarn of fine animal hair (carded or combed)", "Textiles"));
        hsnList.add(createHsn("5109", 5, "Yarn of wool or of fine animal hair, put up for retail sale", "Textiles"));
        hsnList.add(createHsn("5110", 5, "Yarn of coarse animal hair or of horsehair", "Textiles"));
        hsnList.add(createHsn("5111", 5, "Woven fabrics of carded wool or of carded fine animal hair", "Textiles"));
        hsnList.add(createHsn("5112", 5, "Woven fabrics of combed wool or of combed fine animal hair", "Textiles"));
        hsnList.add(createHsn("5113", 5, "Woven fabrics of coarse animal hair or of horsehair", "Textiles"));
        
        // Chapter 52: Cotton
        hsnList.add(createHsn("5201", 5, "Cotton, not carded or combed", "Textiles"));
        hsnList.add(createHsn("5202", 5, "Cotton waste", "Textiles"));
        hsnList.add(createHsn("5203", 5, "Cotton, carded or combed", "Textiles"));
        hsnList.add(createHsn("5204", 5, "Cotton sewing thread", "Textiles"));
        hsnList.add(createHsn("5205", 5, "Cotton yarn (excluding sewing thread)", "Textiles"));
        hsnList.add(createHsn("5206", 5, "Cotton yarn (excluding sewing thread), put up for retail sale", "Textiles"));
        hsnList.add(createHsn("5207", 5, "Cotton yarn (excluding sewing thread), put up for retail sale", "Textiles"));
        hsnList.add(createHsn("5208", 5, "Woven fabrics of cotton", "Textiles"));
        hsnList.add(createHsn("5209", 5, "Woven fabrics of cotton, containing 85% or more by weight of cotton", "Textiles"));
        hsnList.add(createHsn("5210", 5, "Woven fabrics of cotton, containing less than 85% by weight of cotton", "Textiles"));
        hsnList.add(createHsn("5211", 5, "Woven fabrics of cotton", "Textiles"));
        hsnList.add(createHsn("5212", 5, "Other woven fabrics of cotton", "Textiles"));
        
        // Chapter 53: Other Vegetable Textile Fibres
        hsnList.add(createHsn("5301", 5, "Flax, raw or processed", "Textiles"));
        hsnList.add(createHsn("5302", 5, "True hemp, raw or processed", "Textiles"));
        hsnList.add(createHsn("5303", 5, "Jute and other textile bast fibres", "Textiles"));
        hsnList.add(createHsn("5305", 5, "Coconut, abaca, ramie and other vegetable textile fibres", "Textiles"));
        hsnList.add(createHsn("5306", 5, "Flax yarn", "Textiles"));
        hsnList.add(createHsn("5307", 5, "Yarn of jute or of other textile bast fibres", "Textiles"));
        hsnList.add(createHsn("5308", 5, "Yarn of other vegetable textile fibres", "Textiles"));
        hsnList.add(createHsn("5309", 5, "Woven fabrics of flax", "Textiles"));
        hsnList.add(createHsn("5310", 5, "Woven fabrics of jute or of other textile bast fibres", "Textiles"));
        hsnList.add(createHsn("5311", 5, "Woven fabrics of other vegetable textile fibres", "Textiles"));
        
        // Chapter 54: Man-Made Filaments
        hsnList.add(createHsn("5401", 18, "Sewing thread of man-made filaments", "Textiles"));
        hsnList.add(createHsn("5402", 18, "Synthetic filament yarn (excluding sewing thread)", "Textiles"));
        hsnList.add(createHsn("5403", 18, "Artificial filament yarn (excluding sewing thread)", "Textiles"));
        hsnList.add(createHsn("5404", 18, "Synthetic monofilament", "Textiles"));
        hsnList.add(createHsn("5405", 18, "Artificial monofilament", "Textiles"));
        hsnList.add(createHsn("5406", 18, "Man-made filament yarn", "Textiles"));
        hsnList.add(createHsn("5407", 18, "Woven fabrics of synthetic filament yarn", "Textiles"));
        hsnList.add(createHsn("5408", 18, "Woven fabrics of artificial filament yarn", "Textiles"));
        
        // Chapter 55: Man-Made Staple Fibres
        hsnList.add(createHsn("5501", 18, "Synthetic filament tow", "Textiles"));
        hsnList.add(createHsn("5502", 18, "Artificial filament tow", "Textiles"));
        hsnList.add(createHsn("5503", 18, "Synthetic staple fibres, not carded, combed or otherwise processed", "Textiles"));
        hsnList.add(createHsn("5504", 18, "Artificial staple fibres, not carded, combed or otherwise processed", "Textiles"));
        hsnList.add(createHsn("5505", 18, "Waste of man-made fibres", "Textiles"));
        hsnList.add(createHsn("5506", 18, "Synthetic staple fibres, carded, combed or otherwise processed", "Textiles"));
        hsnList.add(createHsn("5507", 18, "Artificial staple fibres, carded, combed or otherwise processed", "Textiles"));
        hsnList.add(createHsn("5508", 18, "Sewing thread of man-made staple fibres", "Textiles"));
        hsnList.add(createHsn("5509", 18, "Yarn of synthetic staple fibres", "Textiles"));
        hsnList.add(createHsn("5510", 18, "Yarn of artificial staple fibres", "Textiles"));
        hsnList.add(createHsn("5511", 18, "Yarn of man-made staple fibres, put up for retail sale", "Textiles"));
        hsnList.add(createHsn("5512", 18, "Woven fabrics of synthetic staple fibres", "Textiles"));
        hsnList.add(createHsn("5513", 18, "Woven fabrics of synthetic staple fibres, containing less than 85%", "Textiles"));
        hsnList.add(createHsn("5514", 18, "Woven fabrics of synthetic staple fibres", "Textiles"));
        hsnList.add(createHsn("5515", 18, "Other woven fabrics of synthetic staple fibres", "Textiles"));
        hsnList.add(createHsn("5516", 18, "Woven fabrics of artificial staple fibres", "Textiles"));
        
        // Chapter 56: Wadding, Felt and Nonwovens
        hsnList.add(createHsn("5601", 5, "Wadding of textile materials and articles thereof", "Textiles"));
        hsnList.add(createHsn("5602", 5, "Felt, whether or not impregnated, coated, covered or laminated", "Textiles"));
        hsnList.add(createHsn("5603", 5, "Nonwovens, whether or not impregnated, coated, covered or laminated", "Textiles"));
        hsnList.add(createHsn("5604", 5, "Rubber thread and cord, textile covered", "Textiles"));
        hsnList.add(createHsn("5605", 5, "Metallised yarn", "Textiles"));
        hsnList.add(createHsn("5606", 5, "Gimped yarn, and strip and the like", "Textiles"));
        hsnList.add(createHsn("5607", 18, "Twine, cordage, ropes and cables", "Textiles"));
        hsnList.add(createHsn("5608", 18, "Knotted netting of twine, cordage or rope", "Textiles"));
        hsnList.add(createHsn("5609", 18, "Articles of yarn, strip or the like", "Textiles"));
        
        // Chapter 57: Carpets and Other Textile Floor Coverings
        hsnList.add(createHsn("5701", 5, "Carpets and other textile floor coverings, knotted", "Textiles"));
        hsnList.add(createHsn("5702", 5, "Carpets and other textile floor coverings, woven", "Textiles"));
        hsnList.add(createHsn("5703", 5, "Carpets and other textile floor coverings, tufted", "Textiles"));
        hsnList.add(createHsn("5704", 5, "Carpets and other textile floor coverings, of felt", "Textiles"));
        hsnList.add(createHsn("5705", 5, "Other carpets and other textile floor coverings", "Textiles"));
        
        // Chapter 58: Special Woven Fabrics
        hsnList.add(createHsn("5801", 5, "Woven pile fabrics and chenille fabrics", "Textiles"));
        hsnList.add(createHsn("5802", 5, "Terry towelling and similar woven terry fabrics", "Textiles"));
        hsnList.add(createHsn("5803", 5, "Gauze, other than narrow fabrics of heading 5806", "Textiles"));
        hsnList.add(createHsn("5804", 5, "Tulles and other net fabrics", "Textiles"));
        hsnList.add(createHsn("5805", 5, "Hand-woven tapestries of the type Gobelins, Flanders", "Textiles"));
        hsnList.add(createHsn("5806", 5, "Narrow woven fabrics", "Textiles"));
        hsnList.add(createHsn("5807", 5, "Labels, badges and similar articles of textile materials", "Textiles"));
        hsnList.add(createHsn("5808", 5, "Braids in the piece; ornamental trimmings in the piece", "Textiles"));
        hsnList.add(createHsn("5809", 5, "Woven fabrics of metal thread and woven fabrics of metallised yarn", "Textiles"));
        hsnList.add(createHsn("5810", 5, "Embroidery in the piece, in strips or in motifs", "Textiles"));
        hsnList.add(createHsn("5811", 5, "Quilted textile products in the piece", "Textiles"));
        
        // Chapter 59: Impregnated, Coated, Covered or Laminated Textile Fabrics
        hsnList.add(createHsn("5901", 18, "Textile fabrics coated with gum or amylaceous substances", "Textiles"));
        hsnList.add(createHsn("5902", 18, "Tyre cord fabric of high tenacity yarn of nylon or other polyamides", "Textiles"));
        hsnList.add(createHsn("5903", 18, "Textile fabrics impregnated, coated, covered or laminated with plastics", "Textiles"));
        hsnList.add(createHsn("5904", 18, "Linoleum, whether or not cut to shape", "Textiles"));
        hsnList.add(createHsn("5905", 18, "Textile wall coverings", "Textiles"));
        hsnList.add(createHsn("5906", 18, "Rubberised textile fabrics", "Textiles"));
        hsnList.add(createHsn("5907", 18, "Textile fabrics otherwise impregnated, coated or covered", "Textiles"));
        hsnList.add(createHsn("5908", 18, "Textile wicks, woven, plaited or knitted", "Textiles"));
        hsnList.add(createHsn("5909", 18, "Textile hosepiping and similar textile tubing", "Textiles"));
        hsnList.add(createHsn("5910", 18, "Transmission or conveyor belts or belting, of textile material", "Textiles"));
        hsnList.add(createHsn("5911", 18, "Textile products and articles, for technical uses", "Textiles"));
        
        // Chapter 60: Knitted or Crocheted Fabrics
        hsnList.add(createHsn("6001", 5, "Pile fabrics, knitted or crocheted", "Textiles"));
        hsnList.add(createHsn("6002", 5, "Knitted or crocheted fabrics of a width not exceeding 30 cm", "Textiles"));
        hsnList.add(createHsn("6003", 5, "Knitted or crocheted fabrics of a width exceeding 30 cm", "Textiles"));
        hsnList.add(createHsn("6004", 5, "Knitted or crocheted fabrics of a width exceeding 30 cm", "Textiles"));
        hsnList.add(createHsn("6005", 5, "Warp knit fabrics", "Textiles"));
        hsnList.add(createHsn("6006", 5, "Other knitted or crocheted fabrics", "Textiles"));
        
        // Chapter 61: Articles of Apparel and Clothing Accessories, Knitted or Crocheted
        hsnList.add(createHsn("6101", 5, "Men's or boys' overcoats, car-coats, capes, cloaks", "Clothing"));
        hsnList.add(createHsn("6102", 5, "Women's or girls' overcoats, car-coats, capes, cloaks", "Clothing"));
        hsnList.add(createHsn("6103", 5, "Men's or boys' suits, ensembles, jackets, blazers, trousers", "Clothing"));
        hsnList.add(createHsn("6104", 5, "Women's or girls' suits, ensembles, jackets, blazers, dresses", "Clothing"));
        hsnList.add(createHsn("6105", 5, "Men's or boys' shirts, knitted or crocheted", "Clothing"));
        hsnList.add(createHsn("6106", 5, "Women's or girls' blouses, shirts and shirt-blouses", "Clothing"));
        hsnList.add(createHsn("6107", 5, "Men's or boys' underpants, briefs, nightshirts, pyjamas", "Clothing"));
        hsnList.add(createHsn("6108", 5, "Women's or girls' slips, petticoats, briefs, panties, nightdresses", "Clothing"));
        hsnList.add(createHsn("6109", 5, "T-shirts, singlets and other vests, knitted or crocheted", "Clothing"));
        hsnList.add(createHsn("6110", 5, "Jerseys, pullovers, cardigans, waist-coats and similar articles", "Clothing"));
        hsnList.add(createHsn("6111", 5, "Babies' garments and clothing accessories, knitted or crocheted", "Clothing"));
        hsnList.add(createHsn("6112", 5, "Track suits, ski suits and swimwear, knitted or crocheted", "Clothing"));
        hsnList.add(createHsn("6113", 5, "Garments, made up of knitted or crocheted fabrics", "Clothing"));
        hsnList.add(createHsn("6114", 5, "Other garments, knitted or crocheted", "Clothing"));
        hsnList.add(createHsn("6115", 5, "Panty hose, tights, stockings, socks and other hosiery", "Clothing"));
        hsnList.add(createHsn("6116", 5, "Gloves, mittens and mitts, knitted or crocheted", "Clothing"));
        hsnList.add(createHsn("6117", 5, "Made-up clothing accessories, knitted or crocheted", "Clothing"));
        
        // Chapter 62: Articles of Apparel and Clothing Accessories, Not Knitted or Crocheted
        hsnList.add(createHsn("6201", 5, "Men's or boys' overcoats, car-coats, capes, cloaks", "Clothing"));
        hsnList.add(createHsn("6202", 5, "Women's or girls' overcoats, car-coats, capes, cloaks", "Clothing"));
        hsnList.add(createHsn("6203", 5, "Men's or boys' suits, ensembles, jackets, blazers, trousers", "Clothing"));
        hsnList.add(createHsn("6204", 5, "Women's or girls' suits, ensembles, jackets, blazers, dresses", "Clothing"));
        hsnList.add(createHsn("6205", 5, "Men's or boys' shirts", "Clothing"));
        hsnList.add(createHsn("6206", 5, "Women's or girls' blouses, shirts and shirt-blouses", "Clothing"));
        hsnList.add(createHsn("6207", 5, "Men's or boys' singlets and other vests, underpants, briefs", "Clothing"));
        hsnList.add(createHsn("6208", 5, "Women's or girls' singlets and other vests, slips, petticoats", "Clothing"));
        hsnList.add(createHsn("6209", 5, "Babies' garments and clothing accessories", "Clothing"));
        hsnList.add(createHsn("6210", 5, "Garments, made up of fabrics of heading 5602, 5603, 5903, 5906 or 5907", "Clothing"));
        hsnList.add(createHsn("6211", 5, "Track suits, ski suits and swimwear; other garments", "Clothing"));
        hsnList.add(createHsn("6212", 5, "Brassieres, girdles, corsets, braces, suspenders and similar articles", "Clothing"));
        hsnList.add(createHsn("6213", 5, "Handkerchiefs", "Clothing"));
        hsnList.add(createHsn("6214", 5, "Shawls, scarves, mufflers, mantillas, veils and the like", "Clothing"));
        hsnList.add(createHsn("6215", 5, "Ties, bow ties and cravats", "Clothing"));
        hsnList.add(createHsn("6216", 5, "Gloves, mittens and mitts", "Clothing"));
        hsnList.add(createHsn("6217", 5, "Made-up clothing accessories", "Clothing"));
        
        // Chapter 63: Other Made-up Textile Articles
        hsnList.add(createHsn("6301", 5, "Blankets and travelling rugs", "Textiles"));
        hsnList.add(createHsn("6302", 5, "Bed linen, table linen, toilet linen and kitchen linen", "Textiles"));
        hsnList.add(createHsn("6303", 5, "Curtains (including drapes) and interior blinds", "Textiles"));
        hsnList.add(createHsn("6304", 5, "Other furnishing articles, excluding those of heading 9404", "Textiles"));
        hsnList.add(createHsn("6305", 5, "Sacks and bags, of a kind used for the packing of goods", "Textiles"));
        hsnList.add(createHsn("6306", 5, "Tarpaulins, awnings and sunblinds", "Textiles"));
        hsnList.add(createHsn("6307", 5, "Made-up articles, including dress patterns", "Textiles"));
        hsnList.add(createHsn("6308", 5, "Sets consisting of woven fabric and yarn", "Textiles"));
        hsnList.add(createHsn("6309", 5, "Worn clothing and other worn articles", "Textiles"));
        hsnList.add(createHsn("6310", 5, "Used or new rags, scrap twine, cordage, rope and cables", "Textiles"));
        
        // Chapter 64-67: FOOTWEAR, HEADGEAR, UMBRELLAS
        // Chapter 64: Footwear, Gaiters and the Like
        hsnList.add(createHsn("6401", 18, "Waterproof footwear with rubber or plastics soles", "Footwear"));
        hsnList.add(createHsn("6402", 18, "Other footwear with rubber or plastics soles", "Footwear"));
        hsnList.add(createHsn("6403", 18, "Footwear with leather soles", "Footwear"));
        hsnList.add(createHsn("6404", 18, "Footwear with textile uppers", "Footwear"));
        hsnList.add(createHsn("6405", 18, "Other footwear", "Footwear"));
        hsnList.add(createHsn("6406", 18, "Parts of footwear; gaiters and similar articles", "Footwear"));
        
        // Chapter 65: Headgear and Parts Thereof
        hsnList.add(createHsn("6501", 5, "Hat-forms, hat bodies and hoods of felt", "Headgear"));
        hsnList.add(createHsn("6502", 5, "Hat-shapes, plaited or made by assembling strips", "Headgear"));
        hsnList.add(createHsn("6503", 5, "Felt hats and other felt headgear", "Headgear"));
        hsnList.add(createHsn("6504", 5, "Hats and other headgear, plaited or made by assembling strips", "Headgear"));
        hsnList.add(createHsn("6505", 5, "Hats and other headgear, knitted or crocheted", "Headgear"));
        hsnList.add(createHsn("6506", 5, "Other headgear, whether or not lined or trimmed", "Headgear"));
        hsnList.add(createHsn("6507", 5, "Head-bands, linings, covers, hat foundations", "Headgear"));
        
        // Chapter 66: Umbrellas, Sun Umbrellas, Walking-sticks
        hsnList.add(createHsn("6601", 18, "Umbrellas and sun umbrellas", "Accessories"));
        hsnList.add(createHsn("6602", 18, "Walking-sticks, seat-sticks, whips, riding-crops", "Accessories"));
        hsnList.add(createHsn("6603", 18, "Parts, trimmings and accessories of articles of heading 6601 or 6602", "Accessories"));
        
        // Chapter 67: Prepared Feathers and Down
        hsnList.add(createHsn("6701", 5, "Skins and other parts of birds with their feathers or down", "Accessories"));
        hsnList.add(createHsn("6702", 5, "Artificial flowers, foliage and fruit", "Accessories"));
        hsnList.add(createHsn("6703", 5, "Human hair, dressed, thinned, bleached or otherwise worked", "Accessories"));
        hsnList.add(createHsn("6704", 5, "Wigs, false beards, eyebrows and eyelashes", "Accessories"));
        
        // Chapter 68-70: CONSTRUCTION MATERIALS, CERAMICS, GLASS
        // Chapter 68: Articles of Stone, Plaster, Cement, Asbestos
        hsnList.add(createHsn("6801", 5, "Setts, curbstones and flagstones, of natural stone", "Construction"));
        hsnList.add(createHsn("6802", 12, "Worked monumental or building stone", "Construction"));
        hsnList.add(createHsn("6803", 12, "Worked slate and articles of slate", "Construction"));
        hsnList.add(createHsn("6804", 18, "Millstones, grindstones, grinding wheels and the like", "Construction"));
        hsnList.add(createHsn("6805", 18, "Abrasive powder or grain, on a base of textile material", "Construction"));
        hsnList.add(createHsn("6806", 18, "Mineral wools, expanded mineral materials and mixtures thereof", "Construction"));
        hsnList.add(createHsn("6807", 18, "Articles of asphalt or of similar material", "Construction"));
        hsnList.add(createHsn("6808", 18, "Panels, boards, tiles, blocks and similar articles", "Construction"));
        hsnList.add(createHsn("6809", 18, "Articles of plaster or of compositions based on plaster", "Construction"));
        hsnList.add(createHsn("6810", 28, "Articles of cement, of concrete or of artificial stone", "Construction"));
        hsnList.add(createHsn("6811", 28, "Articles of asbestos-cement, cellulose fibre-cement", "Construction"));
        hsnList.add(createHsn("6812", 18, "Fabricated asbestos fibres", "Construction"));
        hsnList.add(createHsn("6813", 18, "Friction material and articles thereof", "Construction"));
        hsnList.add(createHsn("6814", 18, "Worked mica and articles of mica", "Construction"));
        hsnList.add(createHsn("6815", 18, "Articles of stone or other mineral substances", "Construction"));
        
        // Chapter 69: Ceramic Products
        hsnList.add(createHsn("6901", 12, "Bricks, blocks, tiles and other ceramic goods of siliceous earths", "Ceramics"));
        hsnList.add(createHsn("6902", 12, "Refractory bricks, blocks, tiles and similar refractory ceramic goods", "Ceramics"));
        hsnList.add(createHsn("6903", 12, "Other refractory ceramic goods", "Ceramics"));
        hsnList.add(createHsn("6904", 12, "Ceramic building bricks, flooring blocks, support or filler tiles", "Ceramics"));
        hsnList.add(createHsn("6905", 12, "Roofing tiles, chimney-pots, cowls, chimney liners", "Ceramics"));
        hsnList.add(createHsn("6906", 12, "Ceramic pipes, conduits, guttering and pipe fittings", "Ceramics"));
        hsnList.add(createHsn("6907", 28, "Unglazed ceramic flags and paving, hearth or wall tiles", "Ceramics"));
        hsnList.add(createHsn("6908", 28, "Glazed ceramic flags and paving, hearth or wall tiles", "Ceramics"));
        hsnList.add(createHsn("6909", 18, "Ceramic wares for laboratory, chemical or other technical uses", "Ceramics"));
        hsnList.add(createHsn("6910", 18, "Ceramic sinks, wash basins, water closet bowls", "Ceramics"));
        hsnList.add(createHsn("6911", 12, "Tableware, kitchenware, other household articles and toilet articles", "Ceramics"));
        hsnList.add(createHsn("6912", 12, "Ceramic tableware, kitchenware, other household articles and toilet articles", "Ceramics"));
        hsnList.add(createHsn("6913", 12, "Statuettes and other ornamental ceramic articles", "Ceramics"));
        hsnList.add(createHsn("6914", 12, "Other ceramic articles", "Ceramics"));
        
        // Chapter 70: Glass and Glassware
        hsnList.add(createHsn("7001", 18, "Cullet and other waste and scrap of glass", "Glass"));
        hsnList.add(createHsn("7002", 18, "Glass in balls, rods or tubes, unworked", "Glass"));
        hsnList.add(createHsn("7003", 18, "Cast glass and rolled glass, in sheets or profiles", "Glass"));
        hsnList.add(createHsn("7004", 18, "Drawn glass and blown glass, in sheets", "Glass"));
        hsnList.add(createHsn("7005", 18, "Float glass and surface ground or polished glass", "Glass"));
        hsnList.add(createHsn("7006", 18, "Glass of heading 7003, 7004 or 7005, bent, edge-worked", "Glass"));
        hsnList.add(createHsn("7007", 18, "Safety glass, consisting of toughened or laminated glass", "Glass"));
        hsnList.add(createHsn("7008", 18, "Multiple-walled insulating units of glass", "Glass"));
        hsnList.add(createHsn("7009", 18, "Glass mirrors, whether or not framed", "Glass"));
        hsnList.add(createHsn("7010", 18, "Carboys, bottles, flasks, jars, pots, phials", "Glass"));
        hsnList.add(createHsn("7011", 18, "Glass envelopes (including bulbs and tubes)", "Glass"));
        hsnList.add(createHsn("7013", 18, "Glassware of a kind used for table, kitchen, toilet, office", "Glass"));
        hsnList.add(createHsn("7014", 18, "Signalling glassware and optical elements of glass", "Glass"));
        hsnList.add(createHsn("7015", 18, "Clock or watch glasses and similar glasses", "Glass"));
        hsnList.add(createHsn("7016", 18, "Paving blocks, slabs, bricks, squares, tiles and other articles of pressed or moulded glass", "Glass"));
        hsnList.add(createHsn("7017", 18, "Laboratory, hygienic or pharmaceutical glassware", "Glass"));
        hsnList.add(createHsn("7018", 18, "Glass beads, imitation pearls, imitation precious or semi-precious stones", "Glass"));
        hsnList.add(createHsn("7019", 18, "Glass fibres (including glass wool) and articles thereof", "Glass"));
        hsnList.add(createHsn("7020", 18, "Other articles of glass", "Glass"));

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
