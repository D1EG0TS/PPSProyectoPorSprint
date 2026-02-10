import pymysql
from sqlalchemy.engine.url import make_url

db_url = "mysql+pymysql://root:@localhost/diegoexproof"
url = make_url(db_url)

# Connect to mysql server (no db)
try:
    connection = pymysql.connect(
        host=url.host,
        user=url.username,
        password=url.password,
        port=url.port or 3306
    )

    try:
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {url.database}")
            print(f"Database {url.database} created successfully")
        connection.commit()
    finally:
        connection.close()
except Exception as e:
    print(f"Error creating database: {e}")
