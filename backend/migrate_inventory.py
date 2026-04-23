import sqlite3
import os

def migrate_inventory():
    db_path = os.path.join(os.path.dirname(__file__), 'farm.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("PRAGMA table_info(inventory)")
        columns = [col[1] for col in cursor.fetchall()]
        
        expected_columns = {
            'min_quantity': 'REAL DEFAULT 0',
            'unit_price': 'REAL DEFAULT 0',
            'supplier': 'TEXT',
            'location': 'TEXT',
            'expiry_date': 'TEXT',
            'quantity_used': 'REAL DEFAULT 0',
            'updated_at': 'DATETIME DEFAULT CURRENT_TIMESTAMP'
        }
        
        for col_name, col_type in expected_columns.items():
            if col_name not in columns:
                print(f"Adding {col_name} column...")
                cursor.execute(f"ALTER TABLE inventory ADD COLUMN {col_name} {col_type}")
        
        conn.commit()
        print("Inventory migration completed successfully!")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_inventory()
