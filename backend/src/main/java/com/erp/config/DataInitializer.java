package com.erp.config;

import com.erp.model.Customer;
import com.erp.model.PurchaseInvoice;
import com.erp.model.PurchaseReturn;
import com.erp.model.SalesInvoice;
import com.erp.model.SalesReturn;
import com.erp.model.Supplier;
import com.erp.model.User;
import com.erp.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private PurchaseReturnRepository purchaseReturnRepo;
    @Autowired private PurchaseInvoiceRepository purchaseInvoiceRepo;
    @Autowired private SalesReturnRepository salesReturnRepo;
    @Autowired private SalesInvoiceRepository salesInvoiceRepo;
    @Autowired private StockMovementRepository stockMovRepo;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private SupplierRepository supplierRepo;
    @Autowired private CustomerRepository customerRepo;

    @Override
    public void run(String... args) {
        System.out.println("🔥 DataInitializer RUNNING...");

        if (!userRepository.existsByUsername("admin")) {
            System.out.println("✅ Creating default admin...");

            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@erp.com");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFullName("System Administrator");
            admin.setPhone("9000000000");
            admin.setRoles(Set.of("ROLE_ADMIN"));
            userRepository.save(admin);

            System.out.println("✅ Admin created!");
        } else {
            System.out.println("⚠️ Admin already exists");
        }
        fixPurchaseReturnInvoices();
        fixOrphanPurchaseReturns();
        fixStaleCreditApplied();
        fixSalesReturnInvoices();
        fixStaleSalesCreditApplied();
        fixInvoicePartyDetails();
        fixDuplicateStockMovements();
        fixSalesInvoiceStock();              // ← NEW: ensure stock deducted for all active sales invoices
        fixCreditAppliedOnReturnedInvoices();
        fixAllSupplierBalances();
        fixAllCustomerBalances();
    }

    private void fixSalesInvoiceStock() {
        int fixed = 0;
        for (com.erp.model.SalesInvoice inv : salesInvoiceRepo.findAll()) {
            if (inv.isCancelled() || inv.getItems() == null) continue;
            if ("RETURNED".equals(inv.getPaymentStatus())) continue;
            boolean alreadyHasMovement = stockMovRepo.findAll().stream()
                .anyMatch(m -> "SALES_INVOICE".equals(m.getReferenceType())
                        && inv.getInvoiceNumber() != null
                        && inv.getInvoiceNumber().equals(m.getReferenceNumber()));
            if (alreadyHasMovement) continue;

            for (com.erp.model.InvoiceLineItem item : inv.getItems()) {
                if (item.getItemId() == null || item.getItemId().isEmpty()) continue;
                itemRepo.findById(item.getItemId()).ifPresent(invItem -> {
                    double newStock = invItem.getCurrentStock() - item.getQuantity();
                    invItem.setCurrentStock(newStock);
                    itemRepo.save(invItem);
                    com.erp.model.StockMovement sm = new com.erp.model.StockMovement();
                    sm.setItemId(invItem.getId());
                    sm.setItemName(invItem.getItemName());
                    sm.setMovementType("STOCK_OUT");
                    sm.setReferenceType("SALES_INVOICE");
                    sm.setReferenceNumber(inv.getInvoiceNumber());
                    sm.setQuantity(item.getQuantity());
                    sm.setUnit(invItem.getUnit());
                    sm.setBalanceQty(newStock);
                    sm.setMovementDate(inv.getInvoiceDate() != null ? inv.getInvoiceDate() : java.time.LocalDate.now());
                    sm.setCreatedAt(java.time.LocalDateTime.now());
                    stockMovRepo.save(sm);
                });
            }
            fixed++;
        }
    }

    private void fixPurchaseReturnInvoices() {
        int fixed = 0;
        List<PurchaseInvoice> allInvoices = purchaseInvoiceRepo.findAll();
        for (PurchaseReturn pr : purchaseReturnRepo.findAll()) {
            if (!"APPROVED".equals(pr.getStatus()) && !"COMPLETED".equals(pr.getStatus())) continue;
            PurchaseInvoice inv = null;
            if (pr.getOriginalInvoiceId() != null && !pr.getOriginalInvoiceId().isEmpty())
                inv = purchaseInvoiceRepo.findById(pr.getOriginalInvoiceId()).orElse(null);
            if (inv == null && pr.getOriginalInvoiceNumber() != null) {
                String num = pr.getOriginalInvoiceNumber();
                inv = allInvoices.stream().filter(i -> num.equals(i.getInvoiceNumber())).findFirst().orElse(null);
            }
            if (inv == null) continue;
            double keptGoods = inv.getGrandTotal() - pr.getGrandTotal();
            double newDue    = keptGoods - inv.getPaidAmount(); // negative = supplier owes us
            inv.setBalanceDue(newDue);
            if (pr.getGrandTotal() >= inv.getGrandTotal() - 0.01 || newDue < -0.01) {
                inv.setPaymentStatus("RETURNED");
                inv.setCreditApplied(0.0);
            } else if (newDue <= 0.01) {
                inv.setPaymentStatus("PAID");
            } else {
                inv.setPaymentStatus("PARTIAL");
            }
            purchaseInvoiceRepo.save(inv);
            fixed++;
        }
    }

    private void fixOrphanPurchaseReturns() {
        int fixed = 0;
        java.util.List<PurchaseReturn> orphanReturns = purchaseReturnRepo.findAll().stream()
            .filter(r -> r.getOriginalInvoiceId() == null || r.getOriginalInvoiceId().isEmpty())
            .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
            .collect(java.util.stream.Collectors.toList());

        for (PurchaseReturn ret : orphanReturns) {
            if (ret.getSupplierId() == null) continue;
            java.util.List<PurchaseInvoice> invList = purchaseInvoiceRepo.findBySupplierId(ret.getSupplierId()).stream()
                .filter(i -> !i.isCancelled()).collect(java.util.stream.Collectors.toList());

            if (invList.size() == 1) {
                PurchaseInvoice inv = invList.get(0);
                ret.setOriginalInvoiceId(inv.getId());
                ret.setOriginalInvoiceNumber(inv.getInvoiceNumber());
                purchaseReturnRepo.save(ret);

                double returnAmt = ret.getGrandTotal();
                double keptGoods = inv.getGrandTotal() - returnAmt;
                double newDue    = keptGoods - inv.getPaidAmount();
                inv.setBalanceDue(newDue);
                if (returnAmt >= inv.getGrandTotal() - 0.01 || newDue < -0.01) {
                    inv.setPaymentStatus("RETURNED");
                    inv.setCreditApplied(0.0);
                } else if (newDue <= 0.01) {
                    inv.setPaymentStatus("PAID");
                } else {
                    inv.setPaymentStatus("PARTIAL");
                }
                purchaseInvoiceRepo.save(inv);
                fixed++;
            }
        }
        if (fixed > 0) {
            supplierRepo.findAll().forEach(s -> {
                if (s.getId() != null) {
                    java.util.List<PurchaseInvoice> allInvoices = purchaseInvoiceRepo.findBySupplierId(s.getId()).stream()
                        .filter(i -> !i.isCancelled()).collect(java.util.stream.Collectors.toList());
                    java.util.Map<String, Double> retMapFix = new java.util.HashMap<>();
                    purchaseReturnRepo.findBySupplierId(s.getId()).stream()
                        .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                            && r.getOriginalInvoiceId() != null && !r.getOriginalInvoiceId().isEmpty())
                        .forEach(r -> retMapFix.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum));
                    double weOwe = 0, supOwes = 0;
                    for (PurchaseInvoice inv : allInvoices) {
                        double retAmt    = Math.min(retMapFix.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
                        double keptGoods = inv.getGrandTotal() - retAmt;
                        double paid      = inv.getPaidAmount();
                        weOwe   += Math.max(0, keptGoods - paid);
                        supOwes += Math.max(0, paid - keptGoods);
                    }
                    double bal = s.getOpeningBalance() + weOwe - supOwes;
                    s.setCurrentBalance(bal);
                    s.setBalanceType(bal >= 0 ? "CREDIT" : "DEBIT");
                    supplierRepo.save(s);
                }
            });
        }
    }

    private void fixStaleCreditApplied() {
        int fixed = 0;
        var retMap = new java.util.HashMap<String, Double>();
        purchaseReturnRepo.findAll().stream()
            .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                && r.getOriginalInvoiceId() != null && !r.getOriginalInvoiceId().isEmpty())
            .forEach(r -> retMap.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum));

        for (var inv : purchaseInvoiceRepo.findAll()) {
            if (inv.isCancelled()) continue;
            double creditAmt  = inv.getCreditApplied();
            if (creditAmt <= 0.01) continue; // no credit — skip
            double returnAmt     = Math.min(retMap.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
            double keptGoods     = inv.getGrandTotal() - returnAmt;
            double effectivePaid = inv.getPaidAmount() + creditAmt;
            double newDue        = keptGoods - effectivePaid;
            String newStatus;
            if (returnAmt >= inv.getGrandTotal() - 0.01 || newDue < -0.01) {
                newStatus = "RETURNED";
            } else if (newDue <= 0.01) {
                newStatus = "PAID";
            } else {
                newStatus = "PARTIAL";
            }
            if (!newStatus.equals(inv.getPaymentStatus())) {
                inv.setPaymentStatus(newStatus);
                inv.setBalanceDue(newDue);
                purchaseInvoiceRepo.save(inv);
                fixed++;
            }
        }
    }

    private void fixSalesReturnInvoices() {
        int fixed = 0;
        List<SalesInvoice> allInvoices = salesInvoiceRepo.findAll();
        for (SalesReturn sr : salesReturnRepo.findAll()) {
            if (!"APPROVED".equals(sr.getStatus()) && !"COMPLETED".equals(sr.getStatus())) continue;
            SalesInvoice inv = null;
            if (sr.getOriginalInvoiceId() != null && !sr.getOriginalInvoiceId().isEmpty())
                inv = salesInvoiceRepo.findById(sr.getOriginalInvoiceId()).orElse(null);
            if (inv == null && sr.getOriginalInvoiceNumber() != null) {
                String num = sr.getOriginalInvoiceNumber();
                inv = allInvoices.stream().filter(i -> num.equals(i.getInvoiceNumber())).findFirst().orElse(null);
            }
            if (inv == null) continue;
            double keptGoods = inv.getGrandTotal() - sr.getGrandTotal();
            double newDue    = keptGoods - inv.getPaidAmount(); // negative = customer owes nothing + refund due
            inv.setBalanceDue(newDue);
            if (sr.getGrandTotal() >= inv.getGrandTotal() - 0.01 || newDue < -0.01) {
                inv.setPaymentStatus("RETURNED");
                inv.setCreditApplied(0.0);
            } else if (newDue <= 0.01) {
                inv.setPaymentStatus("PAID");
            } else {
                inv.setPaymentStatus("PARTIAL");
            }
            salesInvoiceRepo.save(inv);
            fixed++;
        }
    }

    private void fixDuplicateStockMovements() {
        for (String refType : new String[]{"SALES_RETURN", "PURCHASE_RETURN"}) {
            java.util.List<com.erp.model.StockMovement> movements = stockMovRepo.findAll().stream()
                .filter(m -> refType.equals(m.getReferenceType())).collect(Collectors.toList());
            Map<String, List<com.erp.model.StockMovement>> grouped = movements.stream()
                .collect(Collectors.groupingBy(m -> m.getReferenceNumber() + "|" + m.getItemId()));
            for (java.util.Map.Entry<String, java.util.List<com.erp.model.StockMovement>> entry : grouped.entrySet()) {
                java.util.List<com.erp.model.StockMovement> list = entry.getValue();
                if (list.size() <= 1) continue;
                java.util.List<com.erp.model.StockMovement> toDelete = list.subList(1, list.size());
                double dupQty = toDelete.stream().mapToDouble(com.erp.model.StockMovement::getQuantity).sum();
                for (com.erp.model.StockMovement dup : toDelete) stockMovRepo.delete(dup);
                itemRepo.findById(list.get(0).getItemId()).ifPresent(item -> {
                    double corrected = "SALES_RETURN".equals(refType)
                        ? Math.max(0, item.getCurrentStock() - dupQty)
                        : item.getCurrentStock() + dupQty;
                    item.setCurrentStock(corrected);
                    itemRepo.save(item);
                });
            }
        }
    }

    private void fixCreditAppliedOnReturnedInvoices() {
        int fixedP = 0, fixedS = 0;

        for (PurchaseInvoice inv : purchaseInvoiceRepo.findAll()) {
            if ("RETURNED".equals(inv.getPaymentStatus()) && inv.getCreditApplied() > 0) {
                inv.setCreditApplied(0.0);
                purchaseInvoiceRepo.save(inv);
                fixedP++;
            }
        }

        for (com.erp.model.SalesInvoice inv : salesInvoiceRepo.findAll()) {
            if ("RETURNED".equals(inv.getPaymentStatus()) && inv.getCreditApplied() > 0) {
                inv.setCreditApplied(0.0);
                salesInvoiceRepo.save(inv);
                fixedS++;
            }
        }
    }

    private void fixStaleSalesCreditApplied() {
        int fixed = 0;
        var retMap = new java.util.HashMap<String, Double>();
        salesReturnRepo.findAll().stream()
            .filter(r -> ("APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                && r.getOriginalInvoiceId() != null && !r.getOriginalInvoiceId().isEmpty())
            .forEach(r -> retMap.merge(r.getOriginalInvoiceId(), r.getGrandTotal(), Double::sum));

        for (var inv : salesInvoiceRepo.findAll()) {
            if (inv.isCancelled()) continue;
            double creditAmt = inv.getCreditApplied();
            if (creditAmt <= 0.01) continue;
            double returnAmt     = Math.min(retMap.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
            double keptGoods     = inv.getGrandTotal() - returnAmt;
            double effectivePaid = inv.getPaidAmount() + creditAmt;
            double newDue        = keptGoods - effectivePaid;
            String newStatus;
            if (returnAmt >= inv.getGrandTotal() - 0.01 || newDue < -0.01) {
                newStatus = "RETURNED";
            } else if (newDue <= 0.01) {
                newStatus = "PAID";
            } else {
                newStatus = "PARTIAL";
            }
            if (!newStatus.equals(inv.getPaymentStatus())) {
                inv.setPaymentStatus(newStatus);
                inv.setBalanceDue(newDue);
                salesInvoiceRepo.save(inv);
                fixed++;
            }
        }
    }

    private void fixInvoicePartyDetails() {
        int fixed = 0;
        for (SalesInvoice inv : salesInvoiceRepo.findAll()) {
            if (inv.getCustomerId() == null || inv.isCancelled()) continue;
            boolean needsFix = (inv.getCustomerAddress() == null || inv.getCustomerAddress().isEmpty());
            if (!needsFix) continue;
            java.util.Optional<Customer> custOpt = customerRepo.findById(inv.getCustomerId());
            if (custOpt.isEmpty()) continue;
            Customer cust = custOpt.get();
            if (inv.getCustomerGstin() == null || inv.getCustomerGstin().isEmpty()) inv.setCustomerGstin(cust.getGstin());
            if (inv.getCustomerAddress() == null || inv.getCustomerAddress().isEmpty()) inv.setCustomerAddress(cust.getAddress());
            if (inv.getCustomerCity() == null || inv.getCustomerCity().isEmpty()) inv.setCustomerCity(cust.getCity());
            if (inv.getCustomerState() == null || inv.getCustomerState().isEmpty()) inv.setCustomerState(cust.getState());
            if (inv.getCustomerPincode() == null || inv.getCustomerPincode().isEmpty()) inv.setCustomerPincode(cust.getPincode());
            if (inv.getCustomerPhone() == null || inv.getCustomerPhone().isEmpty()) inv.setCustomerPhone(cust.getPhone());
            if (inv.getCustomerEmail() == null || inv.getCustomerEmail().isEmpty()) inv.setCustomerEmail(cust.getEmail());
            if (inv.getShippingAddress() == null || inv.getShippingAddress().isEmpty())
                inv.setShippingAddress((cust.getAddress()!=null?cust.getAddress()+" ":"")+(cust.getCity()!=null?cust.getCity()+" ":"")+(cust.getState()!=null?cust.getState():""));
            salesInvoiceRepo.save(inv);
            fixed++;
        }
        for (var inv : purchaseInvoiceRepo.findAll()) {
            if (inv.getSupplierId() == null || inv.isCancelled()) continue;
            boolean needsFix = (inv.getSupplierGstin() == null || inv.getSupplierGstin().isEmpty());
            if (!needsFix) continue;
            java.util.Optional<Supplier> supOpt = supplierRepo.findById(inv.getSupplierId());
            if (supOpt.isEmpty()) continue;
            Supplier sup = supOpt.get();
            if (inv.getSupplierGstin() == null || inv.getSupplierGstin().isEmpty()) inv.setSupplierGstin(sup.getGstin());
            if (inv.getSupplierAddress() == null || inv.getSupplierAddress().isEmpty()) inv.setSupplierAddress(sup.getAddress());
            if (inv.getSupplierCity() == null || inv.getSupplierCity().isEmpty()) inv.setSupplierCity(sup.getCity());
            if (inv.getSupplierState() == null || inv.getSupplierState().isEmpty()) inv.setSupplierState(sup.getState());
            if (inv.getSupplierPhone() == null || inv.getSupplierPhone().isEmpty()) inv.setSupplierPhone(sup.getPhone());
            if (inv.getSupplierEmail() == null || inv.getSupplierEmail().isEmpty()) inv.setSupplierEmail(sup.getEmail());
            purchaseInvoiceRepo.save(inv);
            fixed++;
        }
    }

    private void fixAllSupplierBalances() {
        for (Supplier sup : supplierRepo.findAll()) {
            String sid = sup.getId();
            java.util.List<PurchaseInvoice> allInv = purchaseInvoiceRepo.findBySupplierId(sid).stream()
                .filter(i -> !i.isCancelled()).collect(Collectors.toList());
            java.util.List<PurchaseReturn> allRet = purchaseReturnRepo.findBySupplierId(sid).stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .collect(Collectors.toList());

            java.util.Map<String, Double> retMap = new java.util.HashMap<>();
            for (var ret : allRet) {
                if (ret.getOriginalInvoiceId() == null) continue;
                retMap.merge(ret.getOriginalInvoiceId(), ret.getGrandTotal(), Double::sum);
            }

            double weOwe = 0, supOwes = 0;
            for (var inv : allInv) {
                double returnAmt = Math.min(retMap.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
                double keptGoods = inv.getGrandTotal() - returnAmt;
                double paid      = inv.getPaidAmount();
                weOwe   += Math.max(0, keptGoods - paid);
                supOwes += Math.max(0, paid - keptGoods);
            }
            double balance = sup.getOpeningBalance() + weOwe - supOwes;
            sup.setCurrentBalance(balance);
            sup.setBalanceType(balance >= 0 ? "CREDIT" : "DEBIT");
            supplierRepo.save(sup);
        }
    }

    private void fixAllCustomerBalances() {
        for (Customer cust : customerRepo.findAll()) {
            String cid = cust.getId();
            java.util.List<SalesInvoice> allInv = salesInvoiceRepo.findByCustomerId(cid).stream()
                .filter(i -> !i.isCancelled()).collect(Collectors.toList());
            java.util.List<SalesReturn> allRet = salesReturnRepo.findByCustomerId(cid).stream()
                .filter(r -> "APPROVED".equals(r.getStatus()) || "COMPLETED".equals(r.getStatus()))
                .collect(Collectors.toList());

            java.util.Map<String, Double> retMap = new java.util.HashMap<>();
            for (SalesReturn ret : allRet) {
                if (ret.getOriginalInvoiceId() == null) continue;
                retMap.merge(ret.getOriginalInvoiceId(), ret.getGrandTotal(), Double::sum);
            }

            double customerOwes = 0, weOweCustomer = 0;
            for (SalesInvoice inv : allInv) {
                double returnAmt = Math.min(retMap.getOrDefault(inv.getId(), 0.0), inv.getGrandTotal());
                double keptGoods = inv.getGrandTotal() - returnAmt;
                double paid      = inv.getPaidAmount();
                customerOwes   += Math.max(0, keptGoods - paid);
                weOweCustomer  += Math.max(0, paid - keptGoods);
            }
            double balance = cust.getOpeningBalance() + customerOwes - weOweCustomer;
            cust.setCurrentBalance(balance);
            cust.setBalanceType(balance >= 0 ? "CREDIT" : "DEBIT");
            customerRepo.save(cust);
        }
    }
}
