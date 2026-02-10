import pymysql

try:
    connection = pymysql.connect(
        host="localhost",
        user="root",
        password=""
    )
    with connection.cursor() as cursor:
        cursor.execute("USE appexproof")
        cursor.execute("DESCRIBE storage_locations")
        for row in cursor.fetchall():
            print(row)
except Exception as e:
    print(e)
