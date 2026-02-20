from sqlalchemy import create_engine, inspect
import os

DATABASE_URL = "mysql+pymysql://root:@localhost/diegoexproof"
engine = create_engine(DATABASE_URL)
inspector = inspect(engine)
print(inspector.get_table_names())
