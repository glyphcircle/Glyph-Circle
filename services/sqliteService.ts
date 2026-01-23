
// --- SCHEMA DEFINITION & SEED DATA ---
const INITIAL_SCHEMA: Record<string, any[]> = {
  users: [
    { 
      id: 'master_admin_001', 
      name: 'Master Keeper', 
      role: 'admin', 
      status: 'active', 
      email: 'master@gylphcircle.com', 
      password: 'master123',
      biometric_id: null, 
      uses_biometrics: false,
      credits: 999999,
      created_at: new Date().toISOString()
    },
    { 
      id: 'demo_user_001', 
      name: 'Arjun Seeker', 
      role: 'user', 
      status: 'active', 
      email: 'arjun@example.com', 
      password: 'user123',
      credits: 50,
      created_at: new Date().toISOString()
    }
  ],
  ui_themes: [
    { 
      id: 'theme_default', 
      name: 'Mystic Night', 
      css_class: 'bg-[#0F0F23]', 
      accent_color: 'text-amber-400', 
      font_family: 'lora',
      background_url: '',
      status: 'active',
      created_at: new Date().toISOString()
    },
    { 
      id: 'theme_solar', 
      name: 'Royal Maroon', 
      css_class: 'bg-[#4a0404]', 
      accent_color: 'text-gold-500', 
      font_family: 'cinzel',
      background_url: '',
      status: 'inactive',
      created_at: new Date().toISOString()
    }
  ],
  report_formats: [
    { id: 'rf_01', name: 'Ganesha Gold 1', url: 'https://drive.google.com/file/d/1gzsBJI3fx4MgRKoEdZZseAPibYA7dUex/view?usp=drive_link', type: 'background', status: 'active' }
  ],
  readings: [
    {
      id: 'seed_reading_01',
      user_id: 'demo_user_001',
      type: 'tarot',
      title: 'The Sun',
      content: 'A time of great joy and success is approaching.',
      timestamp: new Date().toISOString(),
      is_favorite: false,
      paid: true,
      meta_data: {}
    }
  ],
  feedback: [],
  store_items: [
    { 
      id: 101, 
      name: '5 Mukhi Rudraksha', 
      category: 'Rudraksha', 
      price: 501.00, 
      description: 'Original Nepali bead for peace and health. Lord Shiva blessing.', 
      image_url: 'https://images.unsplash.com/photo-1620326887707-33a7df064375?q=80&w=400',
      stock: 50, 
      status: 'active' 
    }
  ],
  store_categories: [
    { id: 'cat_01', name: 'Rudraksha', status: 'active' }
  ],
  store_discounts: [
    { id: 'disc_01', code: 'MYSTIC10', percentage: 10, status: 'active' }
  ],
  store_orders: [],
  transactions: [],
  gemstones: [
    { 
        id: 'ruby_01', 
        name: 'Ruby', 
        sanskrit: 'Manikya', 
        planet: 'Sun (Surya)', 
        deity: 'Lord Surya / Agni',
        zodiac: 'Leo (Simha)', 
        benefits: 'Promotes vitality, leadership, and professional success.', 
        mantra: 'Om Ghrinih Suryaya Namah',
        mantra_guide: 'Ohm Ghree-neeh Soor-yah-yah Na-ma-hah',
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?q=80&w=400', 
        status: 'active' 
    }
  ],
  remedy_requests: [],
  featured_content: [],
  image_assets: [
    { id: 'login_logo', name: 'Primary Emblem', path: 'https://drive.google.com/file/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO/view?usp=drive_link', tags: 'login_logo', status: 'active' },
    { id: 'header_logo', name: 'Header Logo', path: 'https://drive.google.com/file/d/1Mt-LsfsxuxNpGY0hholo8qkBv58S6VNO/view?usp=drive_link', tags: 'header_logo', status: 'active' },
    { id: 'report_banner_sacred', name: 'Om Ganesha Banner', path: 'https://images.unsplash.com/photo-1567591414240-e13630603713?q=80&w=1920', tags: 'report_banner', status: 'active' },
    { id: 'bg_ganesha', name: 'Ganesha Texture', path: 'https://images.unsplash.com/photo-1567591414240-e13630603713?q=80&w=1920', tags: 'home_bg', status: 'active' }
  ],
  services: [
    { id: 'numerology', name: 'Numerology', price: 49.00, description: 'Secrets in your name.', path: '/numerology', status: 'active' },
    { id: 'astrology', name: 'Astrology', price: 99.00, description: 'Destiny in stars.', path: '/astrology', status: 'active' }
  ],
  config: [
      { id: 'app_title', key: 'title', value: 'Glyph Circle', status: 'active'},
      { id: 'admin_access_seed', key: 'admin_access_code', value: 'admin@admin', status: 'active'}
  ],
  cloud_providers: [
    { id: 'gdrive_main', provider: 'Google Drive', name: 'Primary Drive', is_active: true, status: 'active' }
  ],
  payment_providers: [
    { id: 'rzp_main', name: 'Razorpay', provider_type: 'razorpay', is_active: true, currency: 'INR', status: 'active' }
  ],
  payment_config: [
    { id: 'pay_conf_01', account_email: 'billing@glyph.co', creditor_name: 'Glyph Circle', creditor_address: '123 Astral Plane, Cosmos', status: 'active' }
  ],
  user_subscriptions: [],
  logs: [],
  dosha_profiles: [],
  mood_entries: [],
  muhurat_queries: [],
  synastry_reports: []
};

declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

const IDB_CONFIG = {
  DB_NAME: 'GlyphCircleStorage_V4', 
  STORE_NAME: 'sqlite_store',
  KEY: 'main_db_binary'
};

const idbAdapter = {
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_CONFIG.DB_NAME, 1); 
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_CONFIG.STORE_NAME)) {
          db.createObjectStore(IDB_CONFIG.STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(request.error);
    });
  },
  save: async (data: Uint8Array) => {
    try {
      const db = await idbAdapter.open();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_CONFIG.STORE_NAME, 'readwrite');
        const store = tx.objectStore(IDB_CONFIG.STORE_NAME);
        const req = store.put(data, IDB_CONFIG.KEY);
        tx.oncomplete = () => resolve();
        req.onerror = (e) => reject(req.error);
      });
    } catch (err) { console.error("IDB Save Error:", err); }
  },
  load: async (): Promise<Uint8Array | null> => {
    try {
      const db = await idbAdapter.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_CONFIG.STORE_NAME, 'readonly');
        const store = tx.objectStore(IDB_CONFIG.STORE_NAME);
        const req = store.get(IDB_CONFIG.KEY);
        req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : (req.result ? new Uint8Array(req.result) : null));
        req.onerror = () => reject(req.error);
      });
    } catch (err) { return null; }
  }
};

class SqliteService {
  private db: any = null;
  private SQL: any = null;
  private isReady: boolean = false;
  private savePromise: Promise<void> = Promise.resolve();
  private initPromise: Promise<void> | null = null;

  constructor() {}

  async init() {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
        try {
          if (!window.initSqlJs) return;

          this.SQL = await window.initSqlJs({
            locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
          });

          let binaryDb = await idbAdapter.load();

          if (binaryDb) {
            try {
                this.db = new this.SQL.Database(binaryDb);
            } catch (e) {
                this.db = new this.SQL.Database();
            }
          } else {
            this.db = new this.SQL.Database();
          }

          await this.runSchemaMigration(true);
          this.isReady = true;
        } catch (err) {
          console.error("SQLite Init Failed:", err);
        }
    })();

    return this.initPromise;
  }

  exportDatabaseBlob(): Blob | null {
      if (!this.db) return null;
      try {
          const binary = this.db.export();
          return new Blob([binary], { type: 'application/x-sqlite3' });
      } catch (e) {
          return null;
      }
  }

  private async runSchemaMigration(isFreshDb: boolean) {
    let schemaChanged = false;
    Object.keys(INITIAL_SCHEMA).forEach(tableName => {
      const sample = INITIAL_SCHEMA[tableName][0];
      let tableExists = false;
      try {
          this.db.exec(`SELECT count(*) FROM ${tableName}`);
          tableExists = true;
      } catch (e) {
          if (sample) {
              const columns = Object.keys(sample);
              const columnDefs = columns.map(k => {
                  const val = sample[k];
                  let type = 'TEXT';
                  if (typeof val === 'number') type = Number.isInteger(val) ? 'INTEGER' : 'REAL';
                  return k === 'id' ? `${k} ${type} PRIMARY KEY` : `${k} ${type}`;
              });
              this.db.run(`CREATE TABLE ${tableName} (${columnDefs.join(', ')})`);
          } else {
              this.db.run(`CREATE TABLE ${tableName} (id TEXT PRIMARY KEY, status TEXT)`);
          }
          schemaChanged = true;
          tableExists = true;
      }

      if (tableExists && sample) {
          const res = this.db.exec(`PRAGMA table_info(${tableName})`);
          const existingCols = res[0].values.map((row: any) => row[1]);
          const columns = Object.keys(sample);
          
          columns.forEach(col => {
              if (!existingCols.includes(col)) {
                  let type = 'TEXT';
                  const val = sample[col];
                  if (typeof val === 'number') type = Number.isInteger(val) ? 'INTEGER' : 'REAL';
                  try {
                      this.db.run(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${type}`);
                      schemaChanged = true;
                  } catch (err) {}
              }
          });
      }

      try {
          const countRes = this.db.exec(`SELECT count(*) as c FROM ${tableName}`);
          const count = countRes[0].values[0][0];
          if (count === 0 && INITIAL_SCHEMA[tableName].length > 0) {
              this.populateTable(tableName, INITIAL_SCHEMA[tableName]);
              schemaChanged = true;
          }
      } catch (e) {}
    });

    if (schemaChanged || isFreshDb) {
        await this.saveToStorage();
    }
  }

  private populateTable(tableName: string, records: any[]) {
      if (records.length === 0) return;
      const columns = Object.keys(records[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      records.forEach(record => {
          const values = columns.map(col => {
              const val = record[col];
              if (val === undefined || val === null) return null;
              if (typeof val === 'object') return JSON.stringify(val);
              return val;
          });
          try { this.db.run(insertSql, values); } catch (e) {}
      });
  }

  exec(sql: string): any[] {
    if (!this.db) return [];
    try {
        const res = this.db.exec(sql);
        if (res.length > 0) {
            const columns = res[0].columns;
            const values = res[0].values;
            return values.map((row: any[]) => {
                const obj: any = {};
                columns.forEach((col: string, i: number) => {
                    try {
                        const val = row[i];
                        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                            obj[col] = JSON.parse(val);
                        } else {
                            obj[col] = val;
                        }
                    } catch {
                        obj[col] = row[i];
                    }
                });
                return obj;
            });
        }
        return [];
    } catch (e) { return []; }
  }

  getAll(tableName: string) { return this.exec(`SELECT * FROM ${tableName}`); }

  getById(tableName: string, id: string | number) {
    const idVal = typeof id === 'string' ? `'${id}'` : id;
    const res = this.exec(`SELECT * FROM ${tableName} WHERE id = ${idVal}`);
    return res[0] || null;
  }

  async insert(tableName: string, data: any) {
    if(!this.db) return null;
    try {
        const columns = Object.keys(data);
        const placeholders = columns.map(() => '?').join(', ');
        const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        const values = columns.map(k => {
            const val = data[k];
            if (val === undefined || val === null) return null;
            if (typeof val === 'object') return JSON.stringify(val);
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
        });
        this.db.run(sql, values);
        await this.saveToStorage(); 
        return data;
    } catch (e) { return null; }
  }

  async update(tableName: string, id: string | number, data: any) {
    if(!this.db) return;
    try {
        const keys = Object.keys(data);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
        const values = keys.map(k => {
            const val = data[k];
            if (val === undefined || val === null) return null;
            if (typeof val === 'object') return JSON.stringify(val);
            if (typeof val === 'boolean') return val ? 1 : 0;
            return val;
        });
        values.push(id);
        this.db.run(sql, values);
        await this.saveToStorage(); 
    } catch (e) { }
  }

  private async saveToStorage() {
    if (this.db) {
        this.savePromise = this.savePromise.then(async () => {
            try {
                const data = this.db.export();
                await idbAdapter.save(data);
            } catch (e) { console.error("CRITICAL: Failed to save DB", e); }
        });
        return this.savePromise;
    }
  }
}

export const sqliteService = new SqliteService();
