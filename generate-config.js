#!/usr/bin/env node

/**
 * Script para gerar firebase-config.js a partir do arquivo .env
 * Execute: node generate-config.js
 */

const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    
    if (!fs.existsSync(envPath)) {
        console.error('❌ Arquivo .env não encontrado!');
        console.log('💡 Copie .env.example para .env e preencha com suas credenciais.');
        process.exit(1);
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    envContent.split('\n').forEach(line => {
        line = line.trim();
        // Ignorar linhas vazias e comentários
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
    
    return env;
}

// Gerar firebase-config.js
function generateConfig() {
    const env = loadEnv();
    
    // Verificar se todas as variáveis estão presentes
    const requiredVars = [
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID'
    ];
    
    const missing = requiredVars.filter(varName => !env[varName]);
    
    if (missing.length > 0) {
        console.error('❌ Variáveis faltando no .env:');
        missing.forEach(varName => console.error(`   - ${varName}`));
        process.exit(1);
    }
    
    // Gerar o conteúdo do firebase-config.js
    const configContent = `// Firebase Configuration
// Este arquivo é gerado automaticamente a partir do .env
// NÃO edite este arquivo manualmente - execute: node generate-config.js

export const firebaseConfig = {
  apiKey: "${env.FIREBASE_API_KEY}",
  authDomain: "${env.FIREBASE_AUTH_DOMAIN}",
  projectId: "${env.FIREBASE_PROJECT_ID}",
  storageBucket: "${env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${env.FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${env.FIREBASE_APP_ID}"
};
`;
    
    // Escrever o arquivo
    const configPath = path.join(__dirname, 'firebase-config.js');
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    console.log('✅ firebase-config.js gerado com sucesso!');
    console.log('📝 Arquivo criado em:', configPath);
}

// Executar
try {
    generateConfig();
} catch (error) {
    console.error('❌ Erro ao gerar configuração:', error.message);
    process.exit(1);
}
