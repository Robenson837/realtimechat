// Script para actualizar MongoDB URI en .env
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔧 VigiChat MongoDB Atlas Configuration');
console.log('=====================================\n');

console.log('Por favor ingresa tu MongoDB Connection String.');
console.log('Debe verse algo así:');
console.log('mongodb+srv://vigichat_user:<password>@vigichat-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority\n');

rl.question('Pega tu connection string aquí: ', (connectionString) => {
    if (!connectionString || !connectionString.includes('mongodb+srv://')) {
        console.log('❌ Connection string inválido. Debe comenzar con "mongodb+srv://"');
        rl.close();
        return;
    }

    try {
        // Add database name to the connection string
        let updatedConnectionString = connectionString;
        if (!updatedConnectionString.includes('/vigichat_db')) {
            updatedConnectionString = updatedConnectionString.replace('/?retryWrites', '/vigichat_db?retryWrites');
        }

        // Read current .env file
        let envContent = fs.readFileSync('.env', 'utf8');
        
        // Update MongoDB URI
        envContent = envContent.replace(
            /MONGODB_URI=.*/,
            `MONGODB_URI=${updatedConnectionString}`
        );

        // Write back to .env file
        fs.writeFileSync('.env', envContent);

        console.log('\n✅ .env file updated successfully!');
        console.log('📊 Updated MongoDB URI in .env');
        console.log('\nNext steps:');
        console.log('1. Run: npm run test-db');
        console.log('2. If successful, run: npm start');
        console.log('\n🎉 Your VigiChat is ready for real data!');

    } catch (error) {
        console.error('❌ Error updating .env file:', error.message);
    }

    rl.close();
});