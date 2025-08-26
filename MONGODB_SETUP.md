# Configuración de MongoDB Atlas (Gratis)

## Paso 1: Crear cuenta en MongoDB Atlas

1. Ve a [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Haz clic en "Try Free"
3. Crea tu cuenta con email y contraseña
4. Verifica tu email

## Paso 2: Crear un Cluster (Gratis)

1. Una vez dentro del dashboard, haz clic en "Build a Database"
2. Selecciona "M0 Sandbox" (Free tier)
3. Selecciona un proveedor de nube (AWS, Google Cloud, o Azure)
4. Elige una región cercana a tu ubicación
5. Dale un nombre a tu cluster (ej: "vigichat-cluster")
6. Haz clic en "Create Cluster"

## Paso 3: Configurar acceso de red

1. Ve a "Network Access" en el menú lateral
2. Haz clic en "Add IP Address"
3. Selecciona "Allow access from anywhere" (0.0.0.0/0) para desarrollo
4. Haz clic en "Confirm"

## Paso 4: Crear usuario de base de datos

1. Ve a "Database Access" en el menú lateral
2. Haz clic en "Add New Database User"
3. Selecciona "Password" como método de autenticación
4. Crea un usuario:
   - Username: `vigichat_user`
   - Password: `vigichat123!` (o tu propia contraseña segura)
5. En "Database User Privileges", selecciona "Read and write to any database"
6. Haz clic en "Add User"

## Paso 5: Obtener string de conexión

1. Ve a "Databases" en el menú lateral
2. Haz clic en "Connect" en tu cluster
3. Selecciona "Connect your application"
4. Selecciona "Node.js" y version "4.1 or later"
5. Copia el connection string que se parece a:
   ```
   mongodb+srv://vigichat_user:<password>@vigichat-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Paso 6: Actualizar el archivo .env

1. Abre el archivo `.env` en tu proyecto
2. Reemplaza la línea `MONGODB_URI=` con tu connection string:
   ```
   MONGODB_URI=mongodb+srv://vigichat_user:vigichat123!@vigichat-cluster.xxxxx.mongodb.net/vigichat_db?retryWrites=true&w=majority
   ```
3. Asegúrate de:
   - Reemplazar `<password>` con tu contraseña real
   - Reemplazar `xxxxx` con tu cluster hash real
   - Agregar `/vigichat_db` antes de `?retryWrites`

## Ejemplo de .env configurado:

```env
MONGODB_URI=mongodb+srv://vigichat_user:vigichat123!@vigichat-cluster.abc123.mongodb.net/vigichat_db?retryWrites=true&w=majority
JWT_SECRET=mi-clave-super-secreta-para-desarrollo-2024
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5000
```

## Verificar conexión

1. Ejecuta tu aplicación: `npm start` o `node server.js`
2. Busca en la consola el mensaje: "✅ Connected to MongoDB Atlas successfully!"
3. Si ves este mensaje, ¡la configuración es exitosa!

## Errores comunes y soluciones:

### Error: "IP not whitelisted"
- Solución: Agrega tu IP en "Network Access" → "Add IP Address"

### Error: "Authentication failed"
- Solución: Verifica usuario/contraseña en "Database Access"

### Error: "Server selection timeout"
- Solución: Verifica el connection string y la conectividad a internet

### Error: "Database name missing"
- Solución: Asegúrate de que el connection string incluya `/vigichat_db`

## Características del Free Tier:

- ✅ 512 MB de almacenamiento
- ✅ Conexiones ilimitadas
- ✅ Clusters compartidos
- ✅ Perfecto para desarrollo y testing
- ❌ No incluye backups automáticos
- ❌ No incluye soporte técnico

¡Tu base de datos estará lista para usar con datos reales!