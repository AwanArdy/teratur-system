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
import { env } from '../config/env.js';

export type SeedIngredient = {
  sku: string;
  name: string;
  category: 'dairy' | 'coffee_bean' | 'syrup' | 'packaging' | 'flavor_powder' | 'other';
  uom: 'ml' | 'gram' | 'kg' | 'pcs' | 'liter' | 'botol' | 'karton' | 'pouch' | 'pack' | 'orang' | 'bulan';
  purchasePriceIdr: number;
  lastPurchaseUnitCost: string;
  minStock: string;
  initialStock: string;
};

export type SeedProduct = {
  sku: string;
  name: string;
  category: string;
  sellingPriceIdr: number;
  kind: 'made_to_order' | 'finished_good' | 'pre_order';
  initialStock?: string;
  recipe?: Array<{ ingredientSku: string; qty: number }>;
};

export type SeedStaff = {
  name: string;
  email: string;
  phone: string;
  staffRole: 'cashier' | 'barista' | 'head_barista' | 'store_manager';
  shift: string;
  salary: number;
  allowance: number;
};

export type SeedOutlet = {
  name: string;
  businessType: 'coffee_bakery' | 'restaurant';
  address: string;
  city: string;
  phone: string;
  warehouseName: string;
  warehouseCode: string;
  staff: [SeedStaff, SeedStaff];
  ingredients: SeedIngredient[];
  products: SeedProduct[];
};

export type SeedOrganization = {
  owner: {
    fullName: string;
    email: string;
    phone: string;
    jobTitle: string;
  };
  organization: {
    name: string;
    country: string;
    province: string;
    city: string;
    registerBusinessType: 'restaurant';
  };
  subscription: {
    planCode: 'pro';
    outletLimit: 10;
  };
  supplier: {
    name: string;
    phone: string;
    email: string;
    notes: string;
  };
  outlets: [SeedOutlet, SeedOutlet];
};

export const SEED_DATA: SeedOrganization[] = [
  // ==========================================
  // ORGANISASI 1: Kopi Teratur (Bandung)
  // Owner 1: Budi Santoso
  // Outlet 1: Kopi Teratur - Braga
  // Outlet 2: Kopi Teratur - Dago
  // ==========================================
  {
    owner: {
      fullName: 'Budi Santoso',
      email: 'owner1@teratur.id',
      phone: '081234567890',
      jobTitle: 'Owner / Founder',
    },
    organization: {
      name: 'Kopi Teratur',
      country: 'Indonesia',
      province: 'Jawa Barat',
      city: 'Bandung',
      registerBusinessType: 'restaurant',
    },
    subscription: {
      planCode: 'pro',
      outletLimit: 10,
    },
    supplier: {
      name: 'Roastery Nusantara Bandung',
      phone: '081122334455',
      email: 'order@roasterynusantara.id',
      notes: 'Supplier biji kopi Malabar & perlengkapan Bandung',
    },
    outlets: [
      {
        name: 'Kopi Teratur - Braga',
        businessType: 'coffee_bakery',
        address: 'Jl. Braga No. 88, Sumur Bandung',
        city: 'Bandung',
        phone: '022-4201234',
        warehouseName: 'Gudang Utama Braga',
        warehouseCode: 'WH-BRG-01',
        staff: [
          {
            name: 'Agus Pratama',
            email: 'kasir.braga@teratur.id',
            phone: '08121111001',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 3500000,
            allowance: 500000,
          },
          {
            name: 'Dewi Lestari',
            email: 'barista.braga@teratur.id',
            phone: '08121111002',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 3800000,
            allowance: 500000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-BRG-ARB',
            name: 'Biji Kopi Arabika Malabar Bandung',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 290,
            lastPurchaseUnitCost: '290.0000',
            minStock: '1000.0000',
            initialStock: '15000.0000',
          },
          {
            sku: 'ING-BRG-UHT',
            name: 'Susu Segar UHT Bandung Pasteur',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 22,
            lastPurchaseUnitCost: '22.0000',
            minStock: '5000.0000',
            initialStock: '40000.0000',
          },
          {
            sku: 'ING-BRG-AREN',
            name: 'Gula Aren Asli Ciamis Cair',
            category: 'syrup',
            uom: 'ml',
            purchasePriceIdr: 36,
            lastPurchaseUnitCost: '36.0000',
            minStock: '1500.0000',
            initialStock: '15000.0000',
          },
          {
            sku: 'ING-BRG-CUP16',
            name: 'Cup Kertas Braga 16oz + Tutup',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 900,
            lastPurchaseUnitCost: '900.0000',
            minStock: '100.0000',
            initialStock: '2000.0000',
          },
          {
            sku: 'ING-BRG-BTL1L',
            name: 'Botol Kaca Cold Brew Braga 1 Liter',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 4500,
            lastPurchaseUnitCost: '4500.0000',
            minStock: '20.0000',
            initialStock: '200.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-BRG-AREN',
            name: 'Es Kopi Susu Braga',
            category: 'Signature Coffee',
            sellingPriceIdr: 22000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-BRG-ARB', qty: 18 },
              { ingredientSku: 'ING-BRG-UHT', qty: 120 },
              { ingredientSku: 'ING-BRG-AREN', qty: 30 },
              { ingredientSku: 'ING-BRG-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-BRG-CLDBRW',
            name: 'Braga Cold Brew Heritage 1L',
            category: 'Botolan 1L',
            sellingPriceIdr: 85000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-BRG-ARB', qty: 80 },
              { ingredientSku: 'ING-BRG-BTL1L', qty: 1 },
            ],
          },
          {
            sku: 'PRD-BRG-PICCLO',
            name: 'Piccolo Heritage Braga',
            category: 'Espresso Based',
            sellingPriceIdr: 26000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-BRG-ARB', qty: 18 },
              { ingredientSku: 'ING-BRG-UHT', qty: 100 },
              { ingredientSku: 'ING-BRG-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-BRG-CRSSNT',
            name: 'Croissant Butter Malabar',
            category: 'Pastry & Bakery',
            sellingPriceIdr: 24000,
            kind: 'finished_good',
            initialStock: '35.0000',
          },
          {
            sku: 'PRD-BRG-SRKYA',
            name: 'Toast Roti Srikaya Klasik',
            category: 'Pastry & Bakery',
            sellingPriceIdr: 18000,
            kind: 'finished_good',
            initialStock: '40.0000',
          },
        ],
      },
      {
        name: 'Kopi Teratur - Dago',
        businessType: 'coffee_bakery',
        address: 'Jl. Ir. H. Juanda No. 120, Coblong',
        city: 'Bandung',
        phone: '022-2505678',
        warehouseName: 'Gudang Utama Dago',
        warehouseCode: 'WH-DGO-02',
        staff: [
          {
            name: 'Fajar Hidayat',
            email: 'kasir.dago@teratur.id',
            phone: '08121111003',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 3500000,
            allowance: 500000,
          },
          {
            name: 'Rina Anggraini',
            email: 'barista.dago@teratur.id',
            phone: '08121111004',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 3800000,
            allowance: 500000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-DGO-ARB',
            name: 'Biji Kopi Arabika Gunung Tilu',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 300,
            lastPurchaseUnitCost: '300.0000',
            minStock: '1000.0000',
            initialStock: '12000.0000',
          },
          {
            sku: 'ING-DGO-ALM',
            name: 'Susu Almond Barista Blend',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 45,
            lastPurchaseUnitCost: '45.0000',
            minStock: '3000.0000',
            initialStock: '25000.0000',
          },
          {
            sku: 'ING-DGO-MTC',
            name: 'Bubuk Uji Matcha Premium Dago',
            category: 'flavor_powder',
            uom: 'gram',
            purchasePriceIdr: 350,
            lastPurchaseUnitCost: '350.0000',
            minStock: '300.0000',
            initialStock: '3000.0000',
          },
          {
            sku: 'ING-DGO-VAN',
            name: 'Sirup Madagascar Vanilla Dago',
            category: 'syrup',
            uom: 'ml',
            purchasePriceIdr: 100,
            lastPurchaseUnitCost: '100.0000',
            minStock: '500.0000',
            initialStock: '5000.0000',
          },
          {
            sku: 'ING-DGO-CUP16',
            name: 'Cup Dago Frost 16oz + Strawless Lid',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 950,
            lastPurchaseUnitCost: '950.0000',
            minStock: '100.0000',
            initialStock: '1800.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-DGO-MNTN',
            name: 'Dago Mountain Latte',
            category: 'Specialty Coffee',
            sellingPriceIdr: 28000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-DGO-ARB', qty: 18 },
              { ingredientSku: 'ING-DGO-ALM', qty: 130 },
              { ingredientSku: 'ING-DGO-VAN', qty: 20 },
              { ingredientSku: 'ING-DGO-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-DGO-MTCFSN',
            name: 'Uji Matcha Espresso Dago',
            category: 'Signature Fusion',
            sellingPriceIdr: 32000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-DGO-ARB', qty: 15 },
              { ingredientSku: 'ING-DGO-ALM', qty: 120 },
              { ingredientSku: 'ING-DGO-MTC', qty: 15 },
              { ingredientSku: 'ING-DGO-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-DGO-AMRCN',
            name: 'Iced Black Coffee Dago',
            category: 'Espresso Based',
            sellingPriceIdr: 20000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-DGO-ARB', qty: 18 },
              { ingredientSku: 'ING-DGO-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-DGO-PAIN',
            name: 'Pain au Chocolat Dago',
            category: 'Pastry & Bakery',
            sellingPriceIdr: 27000,
            kind: 'finished_good',
            initialStock: '30.0000',
          },
          {
            sku: 'PRD-DGO-BRWNE',
            name: 'Salted Caramel Fudge Brownie',
            category: 'Pastry & Bakery',
            sellingPriceIdr: 25000,
            kind: 'finished_good',
            initialStock: '35.0000',
          },
        ],
      },
    ],
  },

  // ==========================================
  // ORGANISASI 2: Seduh Selaras (Jakarta)
  // Owner 2: Hendra Wijaya
  // Outlet 3: Seduh Selaras - Senopati
  // Outlet 4: Seduh Selaras - Kemang
  // ==========================================
  {
    owner: {
      fullName: 'Hendra Wijaya',
      email: 'owner2@teratur.id',
      phone: '081398765431',
      jobTitle: 'Managing Partner',
    },
    organization: {
      name: 'Seduh Selaras',
      country: 'Indonesia',
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      registerBusinessType: 'restaurant',
    },
    subscription: {
      planCode: 'pro',
      outletLimit: 10,
    },
    supplier: {
      name: 'PT Kopi Selaras Mandiri Jakarta',
      phone: '081299887766',
      email: 'supply@selarascoffee.com',
      notes: 'Supplier biji kopi blend dan bahan kafe Jakarta',
    },
    outlets: [
      {
        name: 'Seduh Selaras - Senopati',
        businessType: 'coffee_bakery',
        address: 'Jl. Senopati No. 45, Kebayoran Baru',
        city: 'Jakarta Selatan',
        phone: '021-5201234',
        warehouseName: 'Gudang Utama Senopati',
        warehouseCode: 'WH-SNP-03',
        staff: [
          {
            name: 'Dimas Setiawan',
            email: 'kasir.senopati@teratur.id',
            phone: '08122222001',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 4000000,
            allowance: 750000,
          },
          {
            name: 'Maya Putri',
            email: 'barista.senopati@teratur.id',
            phone: '08122222002',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 4200000,
            allowance: 750000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-SNP-ARB',
            name: 'Biji Kopi Espresso Senopati Blend',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 320,
            lastPurchaseUnitCost: '320.0000',
            minStock: '1500.0000',
            initialStock: '18000.0000',
          },
          {
            sku: 'ING-SNP-UHT',
            name: 'Susu Fresh Pasteurisasi Jakarta',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 25,
            lastPurchaseUnitCost: '25.0000',
            minStock: '6000.0000',
            initialStock: '50000.0000',
          },
          {
            sku: 'ING-SNP-SKM',
            name: 'Susu Kental Manis Senopati Premium',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 30,
            lastPurchaseUnitCost: '30.0000',
            minStock: '1000.0000',
            initialStock: '12000.0000',
          },
          {
            sku: 'ING-SNP-CRM',
            name: 'Sirup Salted Caramel Senopati',
            category: 'syrup',
            uom: 'ml',
            purchasePriceIdr: 110,
            lastPurchaseUnitCost: '110.0000',
            minStock: '500.0000',
            initialStock: '6000.0000',
          },
          {
            sku: 'ING-SNP-CUP16',
            name: 'Cup Emboss Senopati 16oz',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 1100,
            lastPurchaseUnitCost: '1100.0000',
            minStock: '100.0000',
            initialStock: '2200.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-SNP-SPNSH',
            name: 'Spanish Latte Senopati',
            category: 'Signature Coffee',
            sellingPriceIdr: 35000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-SNP-ARB', qty: 18 },
              { ingredientSku: 'ING-SNP-UHT', qty: 120 },
              { ingredientSku: 'ING-SNP-SKM', qty: 30 },
              { ingredientSku: 'ING-SNP-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-SNP-CRM',
            name: 'Salted Caramel Macchiato Senopati',
            category: 'Specialty Coffee',
            sellingPriceIdr: 38000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-SNP-ARB', qty: 18 },
              { ingredientSku: 'ING-SNP-UHT', qty: 130 },
              { ingredientSku: 'ING-SNP-CRM', qty: 25 },
              { ingredientSku: 'ING-SNP-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-SNP-FLTWHT',
            name: 'Velvet Flat White Senopati',
            category: 'Espresso Based',
            sellingPriceIdr: 33000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-SNP-ARB', qty: 18 },
              { ingredientSku: 'ING-SNP-UHT', qty: 140 },
              { ingredientSku: 'ING-SNP-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-SNP-TRFFL',
            name: 'Truffle Mushroom Croissant',
            category: 'Artisan Pastry',
            sellingPriceIdr: 38000,
            kind: 'finished_good',
            initialStock: '25.0000',
          },
          {
            sku: 'PRD-SNP-CNMN',
            name: 'Cinnamon Roll Senopati Glaze',
            category: 'Artisan Pastry',
            sellingPriceIdr: 28000,
            kind: 'finished_good',
            initialStock: '30.0000',
          },
        ],
      },
      {
        name: 'Seduh Selaras - Kemang',
        businessType: 'coffee_bakery',
        address: 'Jl. Kemang Raya No. 72, Mampang Prapatan',
        city: 'Jakarta Selatan',
        phone: '021-7195432',
        warehouseName: 'Gudang Utama Kemang',
        warehouseCode: 'WH-KMG-04',
        staff: [
          {
            name: 'Rizky Ramadhan',
            email: 'kasir.kemang@teratur.id',
            phone: '08122222003',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 4000000,
            allowance: 750000,
          },
          {
            name: 'Sarah Nabila',
            email: 'barista.kemang@teratur.id',
            phone: '08122222004',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 4200000,
            allowance: 750000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-KMG-ROB',
            name: 'Biji Kopi Fine Robusta Flores Kemang',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 180,
            lastPurchaseUnitCost: '180.0000',
            minStock: '1000.0000',
            initialStock: '14000.0000',
          },
          {
            sku: 'ING-KMG-OAT',
            name: 'Susu Oat Barista Kemang Blend',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 42,
            lastPurchaseUnitCost: '42.0000',
            minStock: '4000.0000',
            initialStock: '30000.0000',
          },
          {
            sku: 'ING-KMG-TEA',
            name: 'Daun Teh Hitam Earl Grey Kemang',
            category: 'other',
            uom: 'gram',
            purchasePriceIdr: 150,
            lastPurchaseUnitCost: '150.0000',
            minStock: '300.0000',
            initialStock: '4000.0000',
          },
          {
            sku: 'ING-KMG-BERRY',
            name: 'Sirup Wild Forest Berry Kemang',
            category: 'syrup',
            uom: 'ml',
            purchasePriceIdr: 105,
            lastPurchaseUnitCost: '105.0000',
            minStock: '500.0000',
            initialStock: '5000.0000',
          },
          {
            sku: 'ING-KMG-CUP16',
            name: 'Cup Kemang Eco 16oz',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 1000,
            lastPurchaseUnitCost: '1000.0000',
            minStock: '100.0000',
            initialStock: '2000.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-KMG-OATLT',
            name: 'Kemang Oat Pandan Latte',
            category: 'Plant-Based Latte',
            sellingPriceIdr: 36000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-KMG-ROB', qty: 16 },
              { ingredientSku: 'ING-KMG-OAT', qty: 140 },
              { ingredientSku: 'ING-KMG-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-KMG-BERRY',
            name: 'Wild Berry Iced Tea Kemang',
            category: 'Artisan Tea',
            sellingPriceIdr: 28000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-KMG-TEA', qty: 6 },
              { ingredientSku: 'ING-KMG-BERRY', qty: 30 },
              { ingredientSku: 'ING-KMG-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-KMG-ERLGRY',
            name: 'Earl Grey Milk Tea Macchiato',
            category: 'Artisan Tea',
            sellingPriceIdr: 30000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-KMG-TEA', qty: 8 },
              { ingredientSku: 'ING-KMG-OAT', qty: 120 },
              { ingredientSku: 'ING-KMG-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-KMG-DANISH',
            name: 'Strawberry Cream Cheese Danish',
            category: 'Pastry & Snack',
            sellingPriceIdr: 32000,
            kind: 'finished_good',
            initialStock: '25.0000',
          },
          {
            sku: 'PRD-KMG-FRIES',
            name: 'Truffle Parmesan Potato Wedges',
            category: 'Pastry & Snack',
            sellingPriceIdr: 30000,
            kind: 'finished_good',
            initialStock: '40.0000',
          },
        ],
      },
    ],
  },

  // ==========================================
  // ORGANISASI 3: Rasa Kembara (Yogyakarta)
  // Owner 3: Anisa Rahmawati
  // Outlet 5: Rasa Kembara - Malioboro
  // Outlet 6: Rasa Kembara - Prawirotaman
  // ==========================================
  {
    owner: {
      fullName: 'Anisa Rahmawati',
      email: 'owner3@teratur.id',
      phone: '081328765432',
      jobTitle: 'Founder & CEO',
    },
    organization: {
      name: 'Rasa Kembara',
      country: 'Indonesia',
      province: 'DI Yogyakarta',
      city: 'Kota Yogyakarta',
      registerBusinessType: 'restaurant',
    },
    subscription: {
      planCode: 'pro',
      outletLimit: 10,
    },
    supplier: {
      name: 'Koperasi Kopi Merapi Yogyakarta',
      phone: '081227123456',
      email: 'order@kopimerapi.jogja.id',
      notes: 'Supplier biji kopi Merapi & Menoreh Jogja',
    },
    outlets: [
      {
        name: 'Rasa Kembara - Malioboro',
        businessType: 'coffee_bakery',
        address: 'Jl. Malioboro No. 64, Danurejan',
        city: 'Kota Yogyakarta',
        phone: '0274-561234',
        warehouseName: 'Gudang Utama Malioboro',
        warehouseCode: 'WH-MLB-05',
        staff: [
          {
            name: 'Eko Prasetyo',
            email: 'kasir.malioboro@teratur.id',
            phone: '08123333001',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 2800000,
            allowance: 400000,
          },
          {
            name: 'Sri Wahyuni',
            email: 'barista.malioboro@teratur.id',
            phone: '08123333002',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 3000000,
            allowance: 400000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-MLB-ROB',
            name: 'Biji Kopi Robusta Lereng Merapi',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 140,
            lastPurchaseUnitCost: '140.0000',
            minStock: '1000.0000',
            initialStock: '16000.0000',
          },
          {
            sku: 'ING-MLB-UHT',
            name: 'Susu Segar Sleman Murni',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 18,
            lastPurchaseUnitCost: '18.0000',
            minStock: '4000.0000',
            initialStock: '35000.0000',
          },
          {
            sku: 'ING-MLB-AREN',
            name: 'Gula Semut Aren Kulon Progo',
            category: 'syrup',
            uom: 'ml',
            purchasePriceIdr: 28,
            lastPurchaseUnitCost: '28.0000',
            minStock: '1200.0000',
            initialStock: '14000.0000',
          },
          {
            sku: 'ING-MLB-SKM',
            name: 'Susu Kental Manis Nusantara',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 24,
            lastPurchaseUnitCost: '24.0000',
            minStock: '1000.0000',
            initialStock: '10000.0000',
          },
          {
            sku: 'ING-MLB-CUP16',
            name: 'Cup Motif Bambu Malioboro 16oz',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 800,
            lastPurchaseUnitCost: '800.0000',
            minStock: '100.0000',
            initialStock: '2000.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-MLB-JOSS',
            name: 'Kopi Joss Aren Merapi',
            category: 'Kopi Tradisional',
            sellingPriceIdr: 18000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-MLB-ROB', qty: 18 },
              { ingredientSku: 'ING-MLB-AREN', qty: 30 },
              { ingredientSku: 'ING-MLB-SKM', qty: 20 },
              { ingredientSku: 'ING-MLB-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-MLB-KLPN',
            name: 'Es Kopi Klepon Malioboro',
            category: 'Signature Jogja',
            sellingPriceIdr: 22000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-MLB-ROB', qty: 16 },
              { ingredientSku: 'ING-MLB-UHT', qty: 120 },
              { ingredientSku: 'ING-MLB-AREN', qty: 25 },
              { ingredientSku: 'ING-MLB-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-MLB-TRK',
            name: 'Teh Tarik Malioboro Klasik',
            category: 'Non-Kopi',
            sellingPriceIdr: 16000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-MLB-UHT', qty: 100 },
              { ingredientSku: 'ING-MLB-SKM', qty: 30 },
              { ingredientSku: 'ING-MLB-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-MLB-BKPIA',
            name: 'Bakpia Crispy Kacang Hijau',
            category: 'Kudapan Tradisional',
            sellingPriceIdr: 15000,
            kind: 'finished_good',
            initialStock: '50.0000',
          },
          {
            sku: 'PRD-MLB-SNGKNG',
            name: 'Singkong Keju Merekah Malioboro',
            category: 'Kudapan Tradisional',
            sellingPriceIdr: 14000,
            kind: 'finished_good',
            initialStock: '40.0000',
          },
        ],
      },
      {
        name: 'Rasa Kembara - Prawirotaman',
        businessType: 'coffee_bakery',
        address: 'Jl. Prawirotaman No. 38, Mergangsan',
        city: 'Kota Yogyakarta',
        phone: '0274-375678',
        warehouseName: 'Gudang Utama Prawirotaman',
        warehouseCode: 'WH-PRW-06',
        staff: [
          {
            name: 'Bayu Nugroho',
            email: 'kasir.prawirotaman@teratur.id',
            phone: '08123333003',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 2800000,
            allowance: 400000,
          },
          {
            name: 'Tari Wulandari',
            email: 'barista.prawirotaman@teratur.id',
            phone: '08123333004',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 3000000,
            allowance: 400000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-PRW-ARB',
            name: 'Biji Kopi Arabika Menoreh Washed',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 260,
            lastPurchaseUnitCost: '260.0000',
            minStock: '1000.0000',
            initialStock: '15000.0000',
          },
          {
            sku: 'ING-PRW-UHT',
            name: 'Susu Segar Full Cream Pasteurisasi',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 20,
            lastPurchaseUnitCost: '20.0000',
            minStock: '4000.0000',
            initialStock: '30000.0000',
          },
          {
            sku: 'ING-PRW-HZL',
            name: 'Sirup Roasted Hazelnut Prawiro',
            category: 'syrup',
            uom: 'ml',
            purchasePriceIdr: 90,
            lastPurchaseUnitCost: '90.0000',
            minStock: '500.0000',
            initialStock: '5000.0000',
          },
          {
            sku: 'ING-PRW-TEA',
            name: 'Teh Kulit Kopi Cascara Organik',
            category: 'other',
            uom: 'gram',
            purchasePriceIdr: 100,
            lastPurchaseUnitCost: '100.0000',
            minStock: '300.0000',
            initialStock: '3000.0000',
          },
          {
            sku: 'ING-PRW-CUP16',
            name: 'Paper Cup Craft Prawirotaman 16oz',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 850,
            lastPurchaseUnitCost: '850.0000',
            minStock: '100.0000',
            initialStock: '2000.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-PRW-V60',
            name: 'Manual Brew V60 Arabika Menoreh',
            category: 'Single Origin',
            sellingPriceIdr: 25000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-PRW-ARB', qty: 15 },
              { ingredientSku: 'ING-PRW-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-PRW-CSCR',
            name: 'Cascara Honey Sparkle Prawiro',
            category: 'Signature Fizz',
            sellingPriceIdr: 22000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-PRW-TEA', qty: 10 },
              { ingredientSku: 'ING-PRW-HZL', qty: 15 },
              { ingredientSku: 'ING-PRW-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-PRW-HZL',
            name: 'Iced Hazelnut Menoreh Latte',
            category: 'Espresso Based',
            sellingPriceIdr: 26000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-PRW-ARB', qty: 18 },
              { ingredientSku: 'ING-PRW-UHT', qty: 130 },
              { ingredientSku: 'ING-PRW-HZL', qty: 25 },
              { ingredientSku: 'ING-PRW-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-PRW-BNNA',
            name: 'Banana Bread Slice Prawirotaman',
            category: 'Bakery & Snack',
            sellingPriceIdr: 18000,
            kind: 'finished_good',
            initialStock: '35.0000',
          },
          {
            sku: 'PRD-PRW-TART',
            name: 'Almond Fruit Tart Prawirotaman',
            category: 'Bakery & Snack',
            sellingPriceIdr: 22000,
            kind: 'finished_good',
            initialStock: '30.0000',
          },
        ],
      },
    ],
  },

  // ==========================================
  // ORGANISASI 4: Nusa Rasa Hospitality (Bali)
  // Owner 4: I Made Sukadana
  // Outlet 7: Nusa Rasa - Ubud
  // Outlet 8: Nusa Rasa - Canggu
  // ==========================================
  {
    owner: {
      fullName: 'I Made Sukadana',
      email: 'owner4@teratur.id',
      phone: '081236123456',
      jobTitle: 'Director of Operations',
    },
    organization: {
      name: 'Nusa Rasa Hospitality',
      country: 'Indonesia',
      province: 'Bali',
      city: 'Denpasar',
      registerBusinessType: 'restaurant',
    },
    subscription: {
      planCode: 'pro',
      outletLimit: 10,
    },
    supplier: {
      name: 'PT Kintamani Coffee & Tropical Organics',
      phone: '081338990011',
      email: 'sales@kintamaniorganics.bali',
      notes: 'Supplier biji kopi Kintamani & produk kelapa organik Bali',
    },
    outlets: [
      {
        name: 'Nusa Rasa - Ubud',
        businessType: 'coffee_bakery',
        address: 'Jl. Raya Ubud No. 102, Gianyar',
        city: 'Gianyar',
        phone: '0361-975123',
        warehouseName: 'Gudang Utama Ubud',
        warehouseCode: 'WH-UBD-07',
        staff: [
          {
            name: 'Wayan Darma',
            email: 'kasir.ubud@teratur.id',
            phone: '08124444001',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 3200000,
            allowance: 500000,
          },
          {
            name: 'Ni Kadek Ayu',
            email: 'barista.ubud@teratur.id',
            phone: '08124444002',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 3500000,
            allowance: 500000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-UBD-ARB',
            name: 'Biji Kopi Arabika Kintamani Natural',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 310,
            lastPurchaseUnitCost: '310.0000',
            minStock: '1200.0000',
            initialStock: '16000.0000',
          },
          {
            sku: 'ING-UBD-COCO',
            name: 'Susu Kelapa Organik Ubud Murni',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 30,
            lastPurchaseUnitCost: '30.0000',
            minStock: '3000.0000',
            initialStock: '25000.0000',
          },
          {
            sku: 'ING-UBD-TRMRC',
            name: 'Bubuk Kunyit Madu Botanikal Ubud',
            category: 'flavor_powder',
            uom: 'gram',
            purchasePriceIdr: 220,
            lastPurchaseUnitCost: '220.0000',
            minStock: '300.0000',
            initialStock: '3500.0000',
          },
          {
            sku: 'ING-UBD-TEA',
            name: 'Teh Bunga Telang Kering Organik',
            category: 'other',
            uom: 'gram',
            purchasePriceIdr: 160,
            lastPurchaseUnitCost: '160.0000',
            minStock: '200.0000',
            initialStock: '2500.0000',
          },
          {
            sku: 'ING-UBD-CUP16',
            name: 'Biodegradable Bamboo Cup 16oz',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 1200,
            lastPurchaseUnitCost: '1200.0000',
            minStock: '100.0000',
            initialStock: '1800.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-UBD-GLDN',
            name: 'Golden Turmeric Botanical Latte',
            category: 'Wellness & Herbal',
            sellingPriceIdr: 32000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-UBD-COCO', qty: 150 },
              { ingredientSku: 'ING-UBD-TRMRC', qty: 15 },
              { ingredientSku: 'ING-UBD-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-UBD-KNTM',
            name: 'Coconut Cold Brew Kintamani',
            category: 'Signature Bali',
            sellingPriceIdr: 35000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-UBD-ARB', qty: 18 },
              { ingredientSku: 'ING-UBD-COCO', qty: 120 },
              { ingredientSku: 'ING-UBD-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-UBD-TELANG',
            name: 'Butterfly Pea Flower Tea Ubud',
            category: 'Wellness & Herbal',
            sellingPriceIdr: 24000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-UBD-TEA', qty: 5 },
              { ingredientSku: 'ING-UBD-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-UBD-SMTH',
            name: 'Tropical Dragonfruit Chia Bowl',
            category: 'Healthy Brunch',
            sellingPriceIdr: 45000,
            kind: 'finished_good',
            initialStock: '25.0000',
          },
          {
            sku: 'PRD-UBD-TOAST',
            name: 'Ubud Avocado Sourdough Toast',
            category: 'Healthy Brunch',
            sellingPriceIdr: 40000,
            kind: 'finished_good',
            initialStock: '30.0000',
          },
        ],
      },
      {
        name: 'Nusa Rasa - Canggu',
        businessType: 'coffee_bakery',
        address: 'Jl. Pantai Batu Bolong No. 55, Canggu',
        city: 'Badung',
        phone: '0361-844567',
        warehouseName: 'Gudang Utama Canggu',
        warehouseCode: 'WH-CGU-08',
        staff: [
          {
            name: 'Ketut Adi',
            email: 'kasir.canggu@teratur.id',
            phone: '08124444003',
            staffRole: 'cashier',
            shift: 'Pagi',
            salary: 3400000,
            allowance: 600000,
          },
          {
            name: 'Ni Luh Putu',
            email: 'barista.canggu@teratur.id',
            phone: '08124444004',
            staffRole: 'barista',
            shift: 'Sore',
            salary: 3600000,
            allowance: 600000,
          },
        ],
        ingredients: [
          {
            sku: 'ING-CGU-ARB',
            name: 'Biji Kopi Bali Sunset Espresso Blend',
            category: 'coffee_bean',
            uom: 'gram',
            purchasePriceIdr: 330,
            lastPurchaseUnitCost: '330.0000',
            minStock: '1200.0000',
            initialStock: '18000.0000',
          },
          {
            sku: 'ING-CGU-OAT',
            name: 'Susu Oat Barista Canggu Creamy',
            category: 'dairy',
            uom: 'ml',
            purchasePriceIdr: 45,
            lastPurchaseUnitCost: '45.0000',
            minStock: '4000.0000',
            initialStock: '35000.0000',
          },
          {
            sku: 'ING-CGU-CHC',
            name: 'Bubuk Belgian Dark Chocolate 70%',
            category: 'flavor_powder',
            uom: 'gram',
            purchasePriceIdr: 250,
            lastPurchaseUnitCost: '250.0000',
            minStock: '400.0000',
            initialStock: '4000.0000',
          },
          {
            sku: 'ING-CGU-CRM',
            name: 'Sirup Sea Salt Toffee Canggu',
            category: 'syrup',
            uom: 'ml',
            purchasePriceIdr: 115,
            lastPurchaseUnitCost: '115.0000',
            minStock: '500.0000',
            initialStock: '6000.0000',
          },
          {
            sku: 'ING-CGU-CUP16',
            name: 'Wave Surfer Cup Canggu 16oz',
            category: 'packaging',
            uom: 'pcs',
            purchasePriceIdr: 1100,
            lastPurchaseUnitCost: '1100.0000',
            minStock: '100.0000',
            initialStock: '2000.0000',
          },
        ],
        products: [
          {
            sku: 'PRD-CGU-SLTLAT',
            name: 'Sea Salt Toffee Flat White Canggu',
            category: 'Signature Coastal',
            sellingPriceIdr: 38000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-CGU-ARB', qty: 18 },
              { ingredientSku: 'ING-CGU-OAT', qty: 130 },
              { ingredientSku: 'ING-CGU-CRM', qty: 25 },
              { ingredientSku: 'ING-CGU-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-CGU-DKCHC',
            name: 'Canggu Iced Dark Chocolate 70%',
            category: 'Non-Kopi',
            sellingPriceIdr: 34000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-CGU-CHC', qty: 25 },
              { ingredientSku: 'ING-CGU-OAT', qty: 140 },
              { ingredientSku: 'ING-CGU-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-CGU-ESPR',
            name: 'Canggu Double Espresso on the Rock',
            category: 'Espresso Based',
            sellingPriceIdr: 26000,
            kind: 'made_to_order',
            recipe: [
              { ingredientSku: 'ING-CGU-ARB', qty: 20 },
              { ingredientSku: 'ING-CGU-CUP16', qty: 1 },
            ],
          },
          {
            sku: 'PRD-CGU-CRFFL',
            name: 'Maple Glaze Butter Croffle',
            category: 'Coastal Bakery',
            sellingPriceIdr: 30000,
            kind: 'finished_good',
            initialStock: '35.0000',
          },
          {
            sku: 'PRD-CGU-BGEL',
            name: 'Smoked Beef Cream Cheese Bagel',
            category: 'Coastal Bakery',
            sellingPriceIdr: 48000,
            kind: 'finished_good',
            initialStock: '25.0000',
          },
        ],
      },
    ],
  },
];

export const seed = async () => {
  if (env.NODE_ENV === 'production' || !env.SEED_DEMO) {
    logger.warn('Seed demo dinonaktifkan di environment production atau ketika SEED_DEMO=false.');
    return;
  }

  logger.info('Memulai seed database PostgreSQL (8 Outlet, 4 Owner, 16 Karyawan)...');

  const checkEmail = 'owner1@teratur.id';
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, checkEmail))
    .limit(1);

  if (existingUser) {
    logger.info({ email: checkEmail }, 'Data seed sudah ada, melewati proses insert.');
    return;
  }

  const defaultPasswordHash = await hashPassword('password123');

  await db.transaction(async (tx) => {
    let totalOutlets = 0;
    let totalStaff = 0;
    let totalProducts = 0;
    let totalIngredients = 0;

    for (const orgData of SEED_DATA) {
      // 1. Insert Owner User
      const [ownerUser] = await tx
        .insert(users)
        .values({
          fullName: orgData.owner.fullName,
          email: orgData.owner.email,
          phone: orgData.owner.phone,
          passwordHash: defaultPasswordHash,
          jobTitle: orgData.owner.jobTitle,
          status: 'active',
          emailVerifiedAt: new Date(),
        })
        .returning();

      // 2. Insert Organization
      const [org] = await tx
        .insert(organizations)
        .values({
          name: orgData.organization.name,
          country: orgData.organization.country,
          province: orgData.organization.province,
          city: orgData.organization.city,
          registerBusinessType: orgData.organization.registerBusinessType,
          acceptedTermsAt: new Date(),
        })
        .returning();

      // 3. Insert Subscription
      await tx.insert(subscriptions).values({
        organizationId: org!.id,
        planCode: orgData.subscription.planCode,
        status: 'active',
        outletLimit: orgData.subscription.outletLimit,
      });

      // 4. Insert Supplier
      const [supplier] = await tx
        .insert(suppliers)
        .values({
          organizationId: org!.id,
          name: orgData.supplier.name,
          phone: orgData.supplier.phone,
          email: orgData.supplier.email,
          notes: orgData.supplier.notes,
        })
        .returning();

      let firstOutletId: string | null = null;

      // 5. Process each outlet
      for (const outletData of orgData.outlets) {
        // 5a. Insert Outlet
        const [outlet] = await tx
          .insert(outlets)
          .values({
            organizationId: org!.id,
            name: outletData.name,
            businessType: outletData.businessType,
            address: outletData.address,
            city: outletData.city,
            phone: outletData.phone,
            isActive: true,
          })
          .returning();

        totalOutlets++;
        if (!firstOutletId) {
          firstOutletId = outlet!.id;
        }

        // 5b. Insert Warehouse for Outlet
        const [warehouse] = await tx
          .insert(warehouses)
          .values({
            organizationId: org!.id,
            outletId: outlet!.id,
            name: outletData.warehouseName,
            code: outletData.warehouseCode,
            isDefault: true,
          })
          .returning();

        // 5c. Insert Staff Users, Organization Members, and Staff records
        for (const staffMember of outletData.staff) {
          const [staffUser] = await tx
            .insert(users)
            .values({
              fullName: staffMember.name,
              email: staffMember.email,
              phone: staffMember.phone,
              passwordHash: defaultPasswordHash,
              jobTitle: `${staffMember.staffRole.toUpperCase()} - ${outletData.name}`,
              status: 'active',
              emailVerifiedAt: new Date(),
            })
            .returning();

          await tx.insert(organizationMembers).values({
            organizationId: org!.id,
            userId: staffUser!.id,
            orgRole: 'staff',
            defaultOutletId: outlet!.id,
          });

          await tx.insert(staff).values({
            organizationId: org!.id,
            outletId: outlet!.id,
            userId: staffUser!.id,
            name: staffMember.name,
            staffRole: staffMember.staffRole,
            phone: staffMember.phone,
            email: staffMember.email,
            employmentType: 'full_time',
            joinedOn: '2026-01-01',
            baseSalaryIdr: staffMember.salary,
            allowanceIdr: staffMember.allowance,
            currentShiftLabel: staffMember.shift,
            isActive: true,
          });

          totalStaff++;
        }

        // 5d. Insert Ingredients and initial inventory balances
        const ingredientIdBySku = new Map<string, string>();
        for (const ing of outletData.ingredients) {
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
              supplierId: supplier!.id,
              supplierName: supplier!.name,
              isActive: true,
            })
            .returning();

          totalIngredients++;
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

        // 5e. Insert Products, Recipe Lines, and initial inventory balances for finished goods
        for (const prod of outletData.products) {
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

          totalProducts++;

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
      }

      // 6. Link Owner to Organization in organizationMembers with defaultOutletId
      await tx.insert(organizationMembers).values({
        organizationId: org!.id,
        userId: ownerUser!.id,
        orgRole: 'owner',
        defaultOutletId: firstOutletId,
      });
    }

    logger.info(
      {
        totalOrganizations: SEED_DATA.length,
        totalOutlets,
        totalStaff,
        totalIngredients,
        totalProducts,
      },
      'Seed 8 Outlet, 4 Owner, 16 Karyawan berhasil!'
    );
  });
};

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
