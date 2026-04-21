import sqlite3
import os

def migrate_crops():
    db_path = os.path.join(os.path.dirname(__file__), 'farm.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if field_quantity column exists
        cursor.execute("PRAGMA table_info(crops)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'field_quantity' not in columns:
            print("Adding field_quantity column...")
            cursor.execute("ALTER TABLE crops ADD COLUMN field_quantity REAL DEFAULT 0")
        
        if 'field_unit' not in columns:
            print("Adding field_unit column...")
            cursor.execute("ALTER TABLE crops ADD COLUMN field_unit TEXT DEFAULT 'kg'")
        
        if 'harvest_quantity' not in columns:
            print("Adding harvest_quantity column...")
            cursor.execute("ALTER TABLE crops ADD COLUMN harvest_quantity REAL DEFAULT 0")
        
        if 'harvest_unit' not in columns:
            print("Adding harvest_unit column...")
            cursor.execute("ALTER TABLE crops ADD COLUMN harvest_unit TEXT DEFAULT 'kg'")
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_crops()
