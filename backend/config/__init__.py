# SecureBank Configuration Package
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except Exception:
    pass
