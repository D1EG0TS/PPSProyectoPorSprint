import sys
import os
from sqlalchemy.orm import Session

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.connection import SessionLocal
from app.models.user import Permission

def seed_permissions():
    db = SessionLocal()
    try:
        permissions = [
            # Inventory
            {"name": "inventory:view", "description": "Ver inventario", "module": "Inventario"},
            {"name": "inventory:create", "description": "Crear productos", "module": "Inventario"},
            {"name": "inventory:edit", "description": "Editar productos", "module": "Inventario"},
            {"name": "inventory:delete", "description": "Eliminar productos", "module": "Inventario"},
            
            # Users
            {"name": "users:view", "description": "Ver usuarios", "module": "Usuarios"},
            {"name": "users:manage", "description": "Administrar usuarios", "module": "Usuarios"},
            
            # Warehouses
            {"name": "warehouses:view", "description": "Ver almacenes", "module": "Almacenes"},
            {"name": "warehouses:manage", "description": "Administrar almacenes", "module": "Almacenes"},
            
            # Vehicles
            {"name": "vehicles:view", "description": "Ver vehículos", "module": "Vehículos"},
            {"name": "vehicles:manage", "description": "Administrar vehículos", "module": "Vehículos"},
            
            # Reports
            {"name": "reports:view", "description": "Ver reportes", "module": "Reportes"},
        ]

        print("Seeding permissions...")
        for perm_data in permissions:
            exists = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
            if not exists:
                perm = Permission(**perm_data)
                db.add(perm)
                print(f"Added permission: {perm_data['name']}")
            else:
                print(f"Permission exists: {perm_data['name']}")
        
        db.commit()
        print("Permissions seeding completed!")

    except Exception as e:
        print(f"Error seeding permissions: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_permissions()
