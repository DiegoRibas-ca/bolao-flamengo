# Configuração de Variáveis de Ambiente

## 📋 Visão Geral

Este projeto usa variáveis de ambiente para armazenar as credenciais do Firebase de forma segura. O arquivo `.env` contém os secrets e **NÃO** é commitado no Git.

## 🚀 Setup Inicial

### 1. Criar arquivo .env localmente

Na raiz do projeto, crie um arquivo chamado `.env`:

```bash
# No terminal, na raiz do projeto:
touch .env
```

Ou crie manualmente um arquivo chamado `.env` na pasta raiz do projeto.

### 2. Preencher as variáveis

Edite o arquivo `.env` e preencha com suas credenciais reais do Firebase:

```env
FIREBASE_API_KEY=sua-api-key-aqui
FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
FIREBASE_APP_ID=seu-app-id
```

**Onde encontrar essas credenciais:**
1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em "Configurações do projeto" (ícone de engrenagem)
4. Role até "Seus aplicativos" e clique no ícone `</>` (Web)
5. Copie os valores do objeto `firebaseConfig`

### 3. Gerar arquivo de configuração

Execute o script para gerar `firebase-config.js` a partir do `.env`:

```bash
npm run config
```

Ou:

```bash
node generate-config.js
```

### 4. Verificar

O arquivo `firebase-config.js` será gerado automaticamente. Este arquivo:
- ✅ É usado pela aplicação
- ✅ NÃO é commitado no Git (está no .gitignore)
- ✅ É gerado automaticamente a partir do `.env`

## 📝 Comandos Disponíveis

```bash
# Gerar configuração do Firebase
npm run config

# Setup completo (gera config e mostra instruções)
npm run setup

# Iniciar servidor de desenvolvimento
npm run dev
```

## 🔒 Segurança e GitHub

### ⚠️ IMPORTANTE: O que fazer no repositório GitHub

#### ✅ O que DEVE estar no GitHub:

1. **`.env.example`** (arquivo de exemplo)
   - Crie este arquivo na raiz do projeto
   - Contém a estrutura das variáveis, mas SEM valores reais
   - Serve como template para outros desenvolvedores

   Exemplo de `.env.example`:
   ```env
   FIREBASE_API_KEY=your-api-key-here
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   FIREBASE_APP_ID=your-app-id
   ```

2. **`generate-config.js`** (script de geração)
   - Este arquivo pode estar no GitHub
   - Não contém secrets, apenas a lógica de geração

3. **`.gitignore`** (já configurado)
   - Já contém `.env` e `firebase-config.js`
   - Garante que esses arquivos não sejam commitados

#### ❌ O que NÃO deve estar no GitHub:

1. **`.env`** - Contém seus secrets reais
2. **`firebase-config.js`** - Arquivo gerado com os secrets

### 📤 Passos para configurar no GitHub:

#### Opção 1: Criar `.env.example` (Recomendado)

1. **Criar arquivo `.env.example`** na raiz do projeto:
   ```bash
   cp .env .env.example
   ```

2. **Editar `.env.example`** e substituir valores reais por placeholders:
   ```env
   FIREBASE_API_KEY=your-api-key-here
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   FIREBASE_APP_ID=your-app-id
   ```

3. **Verificar que `.env` está no `.gitignore`**:
   ```bash
   # Verificar se .env está sendo ignorado
   git status
   # O arquivo .env NÃO deve aparecer na lista
   ```

4. **Adicionar e commitar apenas `.env.example`**:
   ```bash
   git add .env.example
   git commit -m "Adiciona template de variáveis de ambiente"
   git push
   ```

#### Opção 2: Verificar se `.env` não está sendo rastreado

Se você já criou o `.env` localmente, verifique se ele não está sendo commitado:

```bash
# Verificar status do Git
git status

# Se .env aparecer na lista, remova do rastreamento (mas mantenha o arquivo local):
git rm --cached .env

# Adicione ao .gitignore (se ainda não estiver)
echo ".env" >> .gitignore

# Commit a remoção
git add .gitignore
git commit -m "Remove .env do rastreamento do Git"
git push
```

### 🔍 Verificar se está tudo certo:

```bash
# Verificar o que será commitado
git status

# Verificar se .env está no .gitignore
cat .gitignore | grep .env
# Deve mostrar: .env

# Verificar se firebase-config.js está no .gitignore
cat .gitignore | grep firebase-config
# Deve mostrar: firebase-config.js
```

## 🔄 Workflow Completo

### Para você (desenvolvedor):

1. ✅ Crie `.env` localmente com suas credenciais
2. ✅ Execute `npm run config` para gerar `firebase-config.js`
3. ✅ Desenvolva normalmente
4. ✅ **NUNCA** faça commit de `.env` ou `firebase-config.js`

### Para outros desenvolvedores (que clonam o repo):

1. Clone o repositório
2. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edite `.env` com suas próprias credenciais do Firebase
4. Execute `npm run config` para gerar `firebase-config.js`
5. Pronto para desenvolver!

## 🆘 Troubleshooting

### Erro: "Arquivo .env não encontrado"
- Certifique-se de que o arquivo `.env` existe na raiz do projeto
- Verifique se você está executando o comando na pasta correta
- Copie de `.env.example` se necessário

### Erro: "Variáveis faltando no .env"
- Verifique se todas as variáveis estão preenchidas no `.env`
- Compare com `.env.example` para ver quais estão faltando
- Certifique-se de que não há espaços extras ou caracteres especiais

### firebase-config.js não está sendo gerado
- Verifique se você tem Node.js instalado: `node --version`
- Execute: `node generate-config.js` manualmente
- Verifique as permissões do arquivo
- Verifique se o arquivo `.env` existe e está na raiz do projeto

### .env foi commitado acidentalmente no GitHub
⚠️ **Ação imediata necessária:**

1. Remova o arquivo do histórico do Git:
   ```bash
   git rm --cached .env
   git commit -m "Remove .env do repositório"
   git push
   ```

2. **IMPORTANTE**: Se você já fez push, considere que suas credenciais podem estar expostas. Você deve:
   - Regenerar as chaves do Firebase no console
   - Atualizar o `.env` local com as novas credenciais
   - Executar `npm run config` novamente

3. Verifique se `.env` está no `.gitignore`:
   ```bash
   echo ".env" >> .gitignore
   git add .gitignore
   git commit -m "Garante que .env está no .gitignore"
   git push
   ```

## 📚 Referências

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Git - Ignorando Arquivos](https://git-scm.com/docs/gitignore)