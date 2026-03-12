from sqlalchemy.orm import Session
from app.models import Role, User, Condition, Unit, Category, SystemConfig
from app.core.config import settings
from app.db.connection import SessionLocal
from app.core.security import get_password_hash
import os
import sys

def seed_roles(db: Session):
    roles = [
        {"name": "super_admin", "description": "Acceso total al sistema (Rol 1)", "level": 100},
        {"name": "admin", "description": "Administrador de inventario (Rol 2)", "level": 50},
        {"name": "moderator", "description": "Moderador y validador (Rol 3)", "level": 30},
        {"name": "operative", "description": "Operador básico (Rol 4)", "level": 10},
        {"name": "visitor", "description": "Solo lectura catálogo público (Rol 5)", "level": 1},
    ]
    
    for role_data in roles:
        role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not role:
            role = Role(**role_data)
            db.add(role)
            print(f"✅ Role creado: {role_data['name']}")
        else:
            # Update description if exists
            role.description = role_data["description"]
            role.level = role_data["level"]
            db.add(role)
            print(f"ℹ️ Role actualizado: {role_data['name']}")
    db.commit()

def seed_conditions(db: Session):
    conditions = [
        {"name": "Nuevo", "description": "Producto nuevo en empaque original"},
        {"name": "Usado - Como Nuevo", "description": "Sin signos de uso visibles"},
        {"name": "Usado - Bueno", "description": "Signos leves de uso"},
        {"name": "Usado - Aceptable", "description": "Signos evidentes de uso pero funcional"},
        {"name": "Dañado", "description": "Necesita reparación o para piezas"},
    ]
    
    for cond_data in conditions:
        condition = db.query(Condition).filter(Condition.name == cond_data["name"]).first()
        if not condition:
            condition = Condition(**cond_data)
            db.add(condition)
            print(f"✅ Condición creada: {cond_data['name']}")
        else:
            print(f"ℹ️ Condición ya existe: {cond_data['name']}")
    db.commit()

def seed_units(db: Session):
    units = [
        {"name": "Unidad", "abbreviation": "u"},
        {"name": "Kilogramo", "abbreviation": "kg"},
        {"name": "Metro", "abbreviation": "m"},
        {"name": "Litro", "abbreviation": "l"},
        {"name": "Caja", "abbreviation": "caja"},
    ]
    
    for unit_data in units:
        unit = db.query(Unit).filter(Unit.name == unit_data["name"]).first()
        if not unit:
            unit = Unit(**unit_data)
            db.add(unit)
            print(f"✅ Unidad creada: {unit_data['name']}")
        else:
            print(f"ℹ️ Unidad ya existe: {unit_data['name']}")
    db.commit()

def seed_categories(db: Session):
    categories = [
        {"name": "Electrónica", "description": "Dispositivos y componentes electrónicos"},
        {"name": "Mobiliario", "description": "Muebles y enseres"},
        {"name": "Papelería", "description": "Artículos de oficina"},
        {"name": "Herramientas", "description": "Herramientas manuales y eléctricas"},
        {"name": "Otros", "description": "Categoría general"},
    ]
    
    for cat_data in categories:
        category = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not category:
            category = Category(**cat_data)
            db.add(category)
            print(f"✅ Categoría creada: {cat_data['name']}")
        else:
            print(f"ℹ️ Categoría ya existe: {cat_data['name']}")
    db.commit()

def seed_system_config(db: Session):
    configs = [
        {"key": "PENALTY_LATE_RETURN_DAILY_AMOUNT", "value": "10.0", "description": "Monto diario de penalización por retraso"},
        {"key": "PENALTY_LATE_RETURN_DAILY_POINTS", "value": "1", "description": "Puntos descontados por día de retraso"},
        {"key": "MAX_LOAN_DAYS_TOOL", "value": "7", "description": "Días máximos de préstamo para herramientas"},
        {"key": "MAX_LOAN_DAYS_VEHICLE", "value": "3", "description": "Días máximos de préstamo para vehículos"},
        {"key": "MAX_LOAN_DAYS_EPP", "value": "30", "description": "Días máximos de préstamo para EPP"},
    ]
    
    for conf in configs:
        existing = db.query(SystemConfig).filter(SystemConfig.key == conf["key"]).first()
        if not existing:
            new_conf = SystemConfig(**conf)
            db.add(new_conf)
            print(f"✅ Configuración creada: {conf['key']}")
        else:
            print(f"ℹ️ Configuración ya existe: {conf['key']}")
    db.commit()

def seed_super_admin(db: Session):
    admin_email = os.getenv("ADMIN_EMAIL", "diegoterrazas@exproof.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "D25terrazas*")
    
    # Validar longitud de contraseña para bcrypt (max 72 bytes)
    if len(admin_password.encode('utf-8')) > 72:
        print("❌ Error: La contraseña de admin es demasiado larga (máx 72 bytes).")
        return

    user = db.query(User).filter(User.email == admin_email).first()
    if not user:
        role = db.query(Role).filter(Role.name == "super_admin").first()
        if not role:
            print("❌ Error: Rol super_admin no encontrado. Ejecuta seed_roles primero.")
            return

        try:
            hashed_password = get_password_hash(admin_password)
            user = User(
                email=admin_email,
                password_hash=hashed_password,
                full_name="Super Admin",
                role_id=role.id,
                is_active=True
            )
            db.add(user)
            db.commit()
            print(f"✅ Usuario Super Admin creado: {admin_email}")
        except Exception as e:
            print(f"❌ Error al crear usuario admin: {e}")
    else:
        print(f"ℹ️ Usuario Super Admin ya existe: {admin_email}")

def main():
    if settings.ENVIRONMENT != "development":
        print("⚠️  Advertencia: Este script solo debe ejecutarse en entorno de desarrollo.")
        confirm = input("¿Estás seguro de que quieres continuar? (s/n): ")
        if confirm.lower() != "s":
            print("❌ Operación cancelada.")
            return

    print("🌱 Iniciando seed de base de datos...")
    
    db = SessionLocal()
    try:
        seed_roles(db)
        seed_conditions(db)
        seed_units(db)
        seed_categories(db)
        seed_system_config(db)
        seed_super_admin(db)
        print("✨ Seed completado exitosamente.")
    except Exception as e:
        print(f"❌ Error durante el seed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
