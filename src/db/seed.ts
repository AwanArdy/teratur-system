import { eq } from 'drizzle-orm';
import { db, queryClient } from './client.js';
import {
  users,
  organizations,
  organizationMembers,
  outlets,
  warehouses,
  subscriptions,
  staff,
  suppliers,
  ingredients,
  products,
  recipeLines,
  inventoryBalances,
} from './schema/index.js';
import { hashPassword } from '../lib/password.js';
import { logger } from '../lib/logger.js';

type SeedIngredient = {
  sku: string;
  name: string;
  category: 'dairy' | 'coffee_bean' | 'syrup' | 'packaging' | 'flavor_powder' | 'other';
  uom: 'ml' | 'gram' | 'kg' | 'pcs' | 'liter' | 'botol' | 'karton' | 'pouch' | 'pack' | 'orang' | 'bulan';
  purchasePriceIdr: number;
  lastPurchaseUnitCost: string;
  minStock: string;
  initialStock: string;
};

type SeedProduct = {
  sku: string;
  name: string;
  category: string;
  sellingPriceIdr: number;
  kind: 'made_to_order' | 'finished_good' | 'pre_order';
  initialStock?: string;
  recipe?: Array<{ ingredientSku: string; qty: number }>;
};

const SEED_INGREDIENTS: SeedIngredient[] = [
  {
    sku: 'ING-BEAN-ARB',
    name: 'Biji Kopi Arabika House Blend',
    category: 'coffee_bean',
    uom: 'gram',
    purchasePriceIdr: 280,
    lastPurchaseUnitCost: '280.0000',
    minStock: '1000.0000',
    initialStock: '15000.0000',
  },
  {
    sku: 'ING-BEAN-ROB',
    name: 'Biji Kopi Robusta Lampung',
    category: 'coffee_bean',
    uom: 'gram',
    purchasePriceIdr: 160,
    lastPurchaseUnitCost: '160.0000',
    minStock: '1000.0000',
    initialStock: '10000.0000',
  },
  {
    sku: 'ING-MILK-UHT',
    name: 'Susu UHT Full Cream',
    category: 'dairy',
    uom: 'ml',
    purchasePriceIdr: 20,
    lastPurchaseUnitCost: '20.0000',
    minStock: '5000.0000',
    initialStock: '50000.0000',
  },
  {
    sku: 'ING-MILK-SKM',
    name: 'Susu Kental Manis',
    category: 'dairy',
    uom: 'ml',
    purchasePriceIdr: 28,
    lastPurchaseUnitCost: '28.0000',
    minStock: '1000.0000',
    initialStock: '10000.0000',
  },
  {
    sku: 'ING-MILK-EVAP',
    name: 'Susu Evaporasi',
    category: 'dairy',
    uom: 'ml',
    purchasePriceIdr: 32,
    lastPurchaseUnitCost: '32.0000',
    minStock: '1000.0000',
    initialStock: '10000.0000',
  },
  {
    sku: 'ING-SYR-AREN',
    name: 'Gula Aren Cair',
    category: 'syrup',
    uom: 'ml',
    purchasePriceIdr: 35,
    lastPurchaseUnitCost: '35.0000',
    minStock: '1500.0000',
    initialStock: '20000.0000',
  },
  {
    sku: 'ING-SYR-VAN',
    name: 'Sirup Vanila',
    category: 'syrup',
    uom: 'ml',
    purchasePriceIdr: 95,
    lastPurchaseUnitCost: '95.0000',
    minStock: '500.0000',
    initialStock: '5000.0000',
  },
  {
    sku: 'ING-SYR-CRM',
    name: 'Sirup Karamel',
    category: 'syrup',
    uom: 'ml',
    purchasePriceIdr: 95,
    lastPurchaseUnitCost: '95.0000',
    minStock: '500.0000',
    initialStock: '5000.0000',
  },
  {
    sku: 'ING-SYR-HZL',
    name: 'Sirup Hazelnut',
    category: 'syrup',
    uom: 'ml',
    purchasePriceIdr: 95,
    lastPurchaseUnitCost: '95.0000',
    minStock: '500.0000',
    initialStock: '5000.0000',
  },
  {
    sku: 'ING-SYR-LYC',
    name: 'Sirup Leci',
    category: 'syrup',
    uom: 'ml',
    purchasePriceIdr: 85,
    lastPurchaseUnitCost: '85.0000',
    minStock: '500.0000',
    initialStock: '5000.0000',
  },
  {
    sku: 'ING-PWD-MTC',
    name: 'Bubuk Matcha Uji',
    category: 'flavor_powder',
    uom: 'gram',
    purchasePriceIdr: 320,
    lastPurchaseUnitCost: '320.0000',
    minStock: '300.0000',
    initialStock: '3000.0000',
  },
  {
    sku: 'ING-PWD-CHC',
    name: 'Bubuk Cokelat Premium',
    category: 'flavor_powder',
    uom: 'gram',
    purchasePriceIdr: 180,
    lastPurchaseUnitCost: '180.0000',
    minStock: '500.0000',
    initialStock: '5000.0000',
  },
  {
    sku: 'ING-PWD-RDV',
    name: 'Bubuk Red Velvet',
    category: 'flavor_powder',
    uom: 'gram',
    purchasePriceIdr: 200,
    lastPurchaseUnitCost: '200.0000',
    minStock: '300.0000',
    initialStock: '3000.0000',
  },
  {
    sku: 'ING-TEA-BLK',
    name: 'Daun Teh Hitam',
    category: 'other',
    uom: 'gram',
    purchasePriceIdr: 120,
    lastPurchaseUnitCost: '120.0000',
    minStock: '300.0000',
    initialStock: '3000.0000',
  },
  {
    sku: 'ING-PKG-CUP16',
    name: 'Cup Plastik 16oz + Tutup',
    category: 'packaging',
    uom: 'pcs',
    purchasePriceIdr: 850,
    lastPurchaseUnitCost: '850.0000',
    minStock: '100.0000',
    initialStock: '2000.0000',
  },
  {
    sku: 'ING-PKG-CUP8H',
    name: 'Paper Cup Hot 8oz + Lid',
    category: 'packaging',
    uom: 'pcs',
    purchasePriceIdr: 900,
    lastPurchaseUnitCost: '900.0000',
    minStock: '100.0000',
    initialStock: '1500.0000',
  },
  {
    sku: 'ING-PKG-BTL1L',
    name: 'Botol PET 1 Liter + Segel',
    category: 'packaging',
    uom: 'pcs',
    purchasePriceIdr: 2500,
    lastPurchaseUnitCost: '2500.0000',
    minStock: '20.0000',
    initialStock: '200.0000',
  },
];

const SEED_PRODUCTS: SeedProduct[] = [
  // Kopi Susu
  {
    sku: 'KPS-AREN-ICE',
    name: 'Es Kopi Susu Gula Aren',
    category: 'Kopi Susu',
    sellingPriceIdr: 22000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-MILK-UHT', qty: 130 },
      { ingredientSku: 'ING-SYR-AREN', qty: 30 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'KPS-KAMPUNG',
    name: 'Es Kopi Susu Tetangga',
    category: 'Kopi Susu',
    sellingPriceIdr: 20000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ROB', qty: 18 },
      { ingredientSku: 'ING-MILK-UHT', qty: 120 },
      { ingredientSku: 'ING-MILK-SKM', qty: 25 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'KPS-PANDAN',
    name: 'Es Kopi Susu Pandan',
    category: 'Kopi Susu',
    sellingPriceIdr: 24000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-MILK-UHT', qty: 130 },
      { ingredientSku: 'ING-SYR-VAN', qty: 20 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },

  // Espresso Based
  {
    sku: 'ESP-AMR-ICE',
    name: 'Iced Americano',
    category: 'Espresso Based',
    sellingPriceIdr: 18000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'ESP-AMR-HOT',
    name: 'Hot Americano',
    category: 'Espresso Based',
    sellingPriceIdr: 18000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-PKG-CUP8H', qty: 1 },
    ],
  },
  {
    sku: 'ESP-LAT-ICE',
    name: 'Iced Caffè Latte',
    category: 'Espresso Based',
    sellingPriceIdr: 25000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-MILK-UHT', qty: 160 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'ESP-CAP-HOT',
    name: 'Hot Cappuccino',
    category: 'Espresso Based',
    sellingPriceIdr: 25000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-MILK-UHT', qty: 150 },
      { ingredientSku: 'ING-PKG-CUP8H', qty: 1 },
    ],
  },
  {
    sku: 'ESP-CRM-MAC',
    name: 'Caramel Macchiato',
    category: 'Espresso Based',
    sellingPriceIdr: 28000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-MILK-UHT', qty: 150 },
      { ingredientSku: 'ING-SYR-CRM', qty: 25 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'ESP-HZL-LAT',
    name: 'Hazelnut Latte',
    category: 'Espresso Based',
    sellingPriceIdr: 27000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 18 },
      { ingredientSku: 'ING-MILK-UHT', qty: 150 },
      { ingredientSku: 'ING-SYR-HZL', qty: 20 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'ESP-TUBRUK',
    name: 'Kopi Tubruk Nusantara',
    category: 'Espresso Based',
    sellingPriceIdr: 12000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ROB', qty: 15 },
      { ingredientSku: 'ING-PKG-CUP8H', qty: 1 },
    ],
  },

  // Non-Kopi
  {
    sku: 'NON-MTC-LAT',
    name: 'Matcha Latte',
    category: 'Non-Kopi',
    sellingPriceIdr: 26000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-PWD-MTC', qty: 20 },
      { ingredientSku: 'ING-MILK-UHT', qty: 160 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'NON-CHC-SIG',
    name: 'Chocolate Signature',
    category: 'Non-Kopi',
    sellingPriceIdr: 24000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-PWD-CHC', qty: 25 },
      { ingredientSku: 'ING-MILK-UHT', qty: 160 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'NON-RDV-LAT',
    name: 'Red Velvet Latte',
    category: 'Non-Kopi',
    sellingPriceIdr: 25000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-PWD-RDV', qty: 25 },
      { ingredientSku: 'ING-MILK-UHT', qty: 160 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'NON-LYC-TEA',
    name: 'Iced Lychee Tea',
    category: 'Non-Kopi',
    sellingPriceIdr: 20000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-TEA-BLK', qty: 5 },
      { ingredientSku: 'ING-SYR-LYC', qty: 30 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },
  {
    sku: 'NON-TEH-TRK',
    name: 'Es Teh Tarik',
    category: 'Non-Kopi',
    sellingPriceIdr: 18000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-TEA-BLK', qty: 6 },
      { ingredientSku: 'ING-MILK-EVAP', qty: 40 },
      { ingredientSku: 'ING-MILK-SKM', qty: 25 },
      { ingredientSku: 'ING-PKG-CUP16', qty: 1 },
    ],
  },

  // Pastry & Snack (finished_good)
  {
    sku: 'SNK-CROISSANT',
    name: 'Croissant Butter',
    category: 'Pastry & Snack',
    sellingPriceIdr: 22000,
    kind: 'finished_good',
    initialStock: '50.0000',
  },
  {
    sku: 'SNK-PAIN-CHC',
    name: 'Pain au Chocolat',
    category: 'Pastry & Snack',
    sellingPriceIdr: 25000,
    kind: 'finished_good',
    initialStock: '40.0000',
  },
  {
    sku: 'SNK-ROTI-BKR',
    name: 'Roti Bakar Cokelat Keju',
    category: 'Pastry & Snack',
    sellingPriceIdr: 20000,
    kind: 'finished_good',
    initialStock: '45.0000',
  },
  {
    sku: 'SNK-KENTANG',
    name: 'Kentang Goreng (French Fries)',
    category: 'Pastry & Snack',
    sellingPriceIdr: 18000,
    kind: 'finished_good',
    initialStock: '60.0000',
  },
  {
    sku: 'SNK-DONAT-GUL',
    name: 'Donat Kampung Gula Halus',
    category: 'Pastry & Snack',
    sellingPriceIdr: 10000,
    kind: 'finished_good',
    initialStock: '80.0000',
  },

  // Botolan 1L
  {
    sku: 'BTL-AREN-1L',
    name: 'Kopi Susu Gula Aren 1 Liter',
    category: 'Botolan 1L',
    sellingPriceIdr: 75000,
    kind: 'made_to_order',
    recipe: [
      { ingredientSku: 'ING-BEAN-ARB', qty: 72 },
      { ingredientSku: 'ING-MILK-UHT', qty: 650 },
      { ingredientSku: 'ING-SYR-AREN', qty: 120 },
      { ingredientSku: 'ING-PKG-BTL1L', qty: 1 },
    ],
  },
];

export const seed = async () => {
  logger.info('Memulai seed database PostgreSQL (Coffee Shop Indonesia)...');

  const demoEmail = 'kasir@teratur.id';
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, demoEmail))
    .limit(1);

  if (existingUser) {
    logger.info({ email: demoEmail }, 'Data seed sudah ada, melewati proses insert.');
    return;
  }

  const passwordHash = await hashPassword('password123');

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        fullName: 'Budi Santoso',
        email: demoEmail,
        phone: '081234567890',
        passwordHash,
        jobTitle: 'Owner / Kasir',
        status: 'active',
        emailVerifiedAt: new Date(),
      })
      .returning();

    const [org] = await tx
      .insert(organizations)
      .values({
        name: 'Kopi Teratur',
        country: 'Indonesia',
        province: 'Jawa Barat',
        city: 'Bandung',
        registerBusinessType: 'restaurant',
        acceptedTermsAt: new Date(),
      })
      .returning();

    const [outlet] = await tx
      .insert(outlets)
      .values({
        organizationId: org!.id,
        name: 'Kopi Teratur - Outlet Pusat',
        businessType: 'coffee_bakery',
        address: 'Jl. Braga No. 88, Sumur Bandung',
        city: 'Bandung',
        phone: '022-4201234',
        isActive: true,
      })
      .returning();

    await tx.insert(organizationMembers).values({
      organizationId: org!.id,
      userId: user!.id,
      orgRole: 'owner',
      defaultOutletId: outlet!.id,
    });

    await tx.insert(subscriptions).values({
      organizationId: org!.id,
      planCode: 'pro',
      status: 'active',
      outletLimit: 5,
    });

    const [warehouse] = await tx
      .insert(warehouses)
      .values({
        organizationId: org!.id,
        outletId: outlet!.id,
        name: 'Gudang Utama',
        code: 'WH-01',
        isDefault: true,
      })
      .returning();

    await tx.insert(staff).values([
      {
        organizationId: org!.id,
        outletId: outlet!.id,
        userId: user!.id,
        name: 'Budi Santoso',
        staffRole: 'cashier',
        phone: '081234567890',
        email: demoEmail,
        employmentType: 'full_time',
        joinedOn: '2026-01-01',
        baseSalaryIdr: 3500000,
        allowanceIdr: 500000,
        currentShiftLabel: 'Pagi',
        isActive: true,
      },
      {
        organizationId: org!.id,
        outletId: outlet!.id,
        name: 'Siti Aminah',
        staffRole: 'head_barista',
        phone: '081298765432',
        employmentType: 'full_time',
        joinedOn: '2026-01-15',
        baseSalaryIdr: 4000000,
        allowanceIdr: 500000,
        currentShiftLabel: 'Pagi',
        isActive: true,
      },
    ]);

    const [roasterySupplier] = await tx
      .insert(suppliers)
      .values([
        {
          organizationId: org!.id,
          name: 'Roastery Nusantara Bandung',
          phone: '081122334455',
          email: 'order@roasterynusantara.id',
          notes: 'Supplier biji kopi Arabika & Robusta',
        },
        {
          organizationId: org!.id,
          name: 'CV Segar Dairy & Sirup',
          phone: '081344556677',
          notes: 'Supplier susu UHT, gula aren, dan sirup',
        },
      ])
      .returning();

    const ingredientIdBySku = new Map<string, string>();
    for (const ing of SEED_INGREDIENTS) {
      const [insertedIng] = await tx
        .insert(ingredients)
        .values({
          organizationId: org!.id,
          sku: ing.sku,
          name: ing.name,
          category: ing.category,
          uom: ing.uom,
          purchasePriceIdr: ing.purchasePriceIdr,
          lastPurchaseUnitCost: ing.lastPurchaseUnitCost,
          minStock: ing.minStock,
          supplierId: roasterySupplier!.id,
          supplierName: roasterySupplier!.name,
          isActive: true,
        })
        .returning();

      ingredientIdBySku.set(ing.sku, insertedIng!.id);

      await tx.insert(inventoryBalances).values({
        organizationId: org!.id,
        outletId: outlet!.id,
        warehouseId: warehouse!.id,
        itemType: 'ingredient',
        itemId: insertedIng!.id,
        qtyOnHand: ing.initialStock,
        qtyReserved: '0.0000',
        avgUnitCost: ing.lastPurchaseUnitCost,
      });
    }

    for (const prod of SEED_PRODUCTS) {
      const [insertedProd] = await tx
        .insert(products)
        .values({
          organizationId: org!.id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          sellingPriceIdr: prod.sellingPriceIdr,
          kind: prod.kind,
          isActive: true,
        })
        .returning();

      if (prod.kind === 'finished_good' && prod.initialStock) {
        await tx.insert(inventoryBalances).values({
          organizationId: org!.id,
          outletId: outlet!.id,
          warehouseId: warehouse!.id,
          itemType: 'finished_good',
          itemId: insertedProd!.id,
          qtyOnHand: prod.initialStock,
          qtyReserved: '0.0000',
          avgUnitCost: Math.round(prod.sellingPriceIdr * 0.45).toFixed(4),
        });
      }

      if (prod.recipe && prod.recipe.length > 0) {
        await tx.insert(recipeLines).values(
          prod.recipe.map((line, index) => {
            const ingId = ingredientIdBySku.get(line.ingredientSku);
            if (!ingId) {
              throw new Error(`Ingredient SKU tidak ditemukan: ${line.ingredientSku}`);
            }
            return {
              organizationId: org!.id,
              productId: insertedProd!.id,
              componentType: 'ingredient' as const,
              componentId: ingId,
              qty: line.qty.toFixed(4),
              sortOrder: index,
            };
          })
        );
      }
    }

    logger.info(
      {
        email: demoEmail,
        password: 'password123',
        outletId: outlet!.id,
        ingredientsCount: SEED_INGREDIENTS.length,
        productsCount: SEED_PRODUCTS.length,
      },
      'Seed Coffee Shop Indonesia berhasil!'
    );
  });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(async () => {
      await queryClient.end();
      process.exit(0);
    })
    .catch(async (err) => {
      logger.error('Error running seed:', err);
      await queryClient.end();
      process.exit(1);
    });
}
