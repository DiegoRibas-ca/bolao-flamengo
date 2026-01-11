# Solução para Problema de Autenticação GitHub

## Problema
Erro ao fazer `git push`: "Missing or invalid credentials" e "Error: Bad status code: 401"

## Causa
O problema **NÃO** é porque o repositório é privado. Repositórios privados funcionam normalmente com autenticação adequada. O problema é que o **Cursor (ou Git) não está autenticado** com o GitHub.

## Soluções (escolha uma)

### Opção 1: Usar Personal Access Token (Recomendado)

1. **Criar um Personal Access Token no GitHub:**
   - Acesse: https://github.com/settings/tokens
   - Clique em "Generate new token" → "Generate new token (classic)"
   - Dê um nome descritivo (ex: "Cursor App")
   - Selecione os escopos necessários:
     - ✅ `repo` (acesso completo aos repositórios)
     - ✅ `workflow` (se usar GitHub Actions)
   - Clique em "Generate token"
   - **COPIE O TOKEN** (você só verá ele uma vez!)

2. **Configurar o token no Git:**
   ```bash
   # No terminal, dentro da pasta do projeto
   git remote set-url origin https://SEU_TOKEN@github.com/SEU_USUARIO/app-bolao.git
   ```
   
   Ou, se preferir usar o formato mais seguro:
   ```bash
   git remote set-url origin https://github.com/SEU_USUARIO/app-bolao.git
   ```
   
   Quando pedir senha, use o token no lugar da senha.

3. **Testar:**
   ```bash
   git push -u origin main
   ```

### Opção 2: Usar GitHub CLI (gh)

1. **Instalar GitHub CLI:**
   ```bash
   # macOS
   brew install gh
   ```

2. **Autenticar:**
   ```bash
   gh auth login
   ```
   - Escolha "GitHub.com"
   - Escolha "HTTPS"
   - Escolha "Login with a web browser"
   - Siga as instruções na tela

3. **Testar:**
   ```bash
   git push -u origin main
   ```

### Opção 3: Configurar SSH (Mais Seguro a Longo Prazo)

1. **Verificar se já tem chave SSH:**
   ```bash
   ls -al ~/.ssh
   ```
   Procure por arquivos como `id_rsa.pub` ou `id_ed25519.pub`

2. **Se não tiver, criar uma nova chave:**
   ```bash
   ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
   ```
   - Pressione Enter para aceitar o local padrão
   - (Opcional) Digite uma senha para a chave

3. **Copiar a chave pública:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```
   Copie toda a saída (começa com `ssh-ed25519`)

4. **Adicionar a chave no GitHub:**
   - Acesse: https://github.com/settings/keys
   - Clique em "New SSH key"
   - Cole a chave pública
   - Dê um título (ex: "MacBook Pro")
   - Clique em "Add SSH key"

5. **Alterar a URL do repositório para SSH:**
   ```bash
   git remote set-url origin git@github.com:SEU_USUARIO/app-bolao.git
   ```

6. **Testar a conexão:**
   ```bash
   ssh -T git@github.com
   ```
   Deve aparecer: "Hi SEU_USUARIO! You've successfully authenticated..."

7. **Testar o push:**
   ```bash
   git push -u origin main
   ```

### Opção 4: Configurar Credenciais no macOS Keychain

1. **Limpar credenciais antigas:**
   ```bash
   git credential-osxkeychain erase
   host=github.com
   protocol=https
   ```
   (Pressione Enter duas vezes)

2. **Fazer push novamente:**
   ```bash
   git push -u origin main
   ```
   - Quando pedir usuário: seu username do GitHub
   - Quando pedir senha: use um **Personal Access Token** (não sua senha do GitHub)

### Opção 5: Configurar no Cursor (Interface)

1. **Abrir configurações do Cursor:**
   - Cmd + , (ou File → Preferences → Settings)

2. **Procurar por "git":**
   - Procure por configurações relacionadas a Git/GitHub

3. **Ou usar a paleta de comandos:**
   - Cmd + Shift + P
   - Digite "Git: Clone"
   - Ou "Git: Push"

## Verificar Configuração Atual

Para ver qual URL está configurada:
```bash
git remote -v
```

Para ver qual usuário está configurado:
```bash
git config user.name
git config user.email
```

## Dica Importante

**Se o repositório é privado**, você PRECISA estar autenticado. Repositórios privados não funcionam sem autenticação, mas isso é normal e esperado.

## Solução Rápida (Se estiver com pressa)

1. Vá em: https://github.com/settings/tokens
2. Crie um token com permissão `repo`
3. No terminal:
   ```bash
   git push -u origin main
   ```
4. Quando pedir senha, cole o token (não sua senha do GitHub)

## Problemas Comuns

### "fatal: could not read Username"
- Solução: Configure a URL do remote com o token ou use SSH

### "Permission denied (publickey)"
- Solução: Use a Opção 3 (SSH) ou Opção 1 (Token via HTTPS)

### "remote: Support for password authentication was removed"
- Solução: GitHub não aceita mais senhas. Use Personal Access Token (Opção 1)

## Recomendação Final

Para desenvolvimento local, recomendo a **Opção 3 (SSH)** por ser mais segura e não expirar. Para uso rápido, use a **Opção 1 (Personal Access Token)**.
