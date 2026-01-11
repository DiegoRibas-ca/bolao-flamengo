# 📥 Guia de Importação de Jogos

## Como Importar Jogos da Planilha do Google Sheets

### Passo 1: Preparar os Dados

1. Abra sua planilha do Google Sheets: [Calendário Fla 2026](https://docs.google.com/spreadsheets/d/1tKw2itUntyHPBV6NolFVCbMxgfoF2Esrayur9nOVLYU/edit?gid=916011010#gid=916011010)

2. Selecione as colunas com os dados dos jogos:
   - **Data** (Coluna B)
   - **Hora** (Coluna C)
   - **Competição** (Coluna D)
   - **Mandante** (Coluna F)
   - **Visitante** (Coluna G)

3. **Copie** os dados (Ctrl+C ou Cmd+C)

### Passo 2: Importar no Aplicativo

1. Faça login como **Administrador**
2. Vá em **Admin** > **Jogos**
3. Na seção **"Importar Jogos da Planilha"**, cole os dados copiados no campo de texto
4. Clique em **"Importar Jogos"**

### Passo 3: Revisar e Confirmar

1. Uma pré-visualização será exibida mostrando todos os jogos que serão importados
2. Revise a lista para garantir que está correto
3. Clique em **"Confirmar Importação"** para finalizar

## Formato dos Dados

O importador aceita dados no formato:
- **Separado por tabulação** (quando copiado do Google Sheets)
- **CSV** (valores separados por vírgula)
- **Múltiplos espaços**

### Exemplo de Formato:

```
11/01/2026	18:00	Carioca	Flamengo	Portuguesa-RJ
14/01/2026	21:30	Carioca	Bangu	Flamengo
17/01/2026	21:30	Carioca	Volta Redonda	Flamengo
```

## Mapeamento de Competições

O sistema mapeia automaticamente as competições da planilha para os IDs do sistema:

| Planilha | ID no Sistema |
|----------|---------------|
| Carioca | `carioca` |
| Brasileirão / Brasileirao | `brasileirao` |
| Supercopa Rei / Supercopa | `supercopa` |
| Recopa | `recopa` |
| Libertadores | `libertadores` |
| Copa do Brasil / Copa Betano do Brasil | `copa_brasil` |
| Mundial / Mundial de Clubes / Club World Cup | `mundial` |

**Importante**: Se uma competição não estiver mapeada, ela será criada automaticamente com o nome em minúsculas e espaços substituídos por `_`.

## Como o Sistema Identifica o Adversário

O sistema identifica automaticamente o adversário:
- Se **Flamengo** está como **Mandante** → Adversário = **Visitante**
- Se **Flamengo** está como **Visitante** → Adversário = **Mandante**

## Tratamento de Horários

- Se a hora estiver como **"A definir"** ou vazia, o sistema usa **20:00** como padrão
- Horas no formato **HH:MM** são preservadas

## Tratamento de Datas

- Formato esperado: **DD/MM/YYYY** (ex: 11/01/2026)
- O sistema converte automaticamente para o formato interno

## Comportamento da Importação

### Jogos Novos
- Jogos que não existem no sistema são **adicionados** como novos

### Jogos Existentes
- Jogos com o mesmo **adversário** e **competição** são **atualizados**
- A data também é considerada na verificação

### Status dos Jogos
- Todos os jogos importados são criados com status **"Próximo"** (upcoming)
- Você pode editar individualmente depois se necessário

## Dicas

1. **Importe em lotes**: Se tiver muitos jogos, pode importar em partes
2. **Revise sempre**: Sempre revise a pré-visualização antes de confirmar
3. **Edite depois**: Você pode editar jogos individualmente após a importação
4. **Verifique competições**: Certifique-se de que as competições existem no sistema antes de importar

## Solução de Problemas

### "Nenhum jogo válido encontrado"
- Verifique se copiou as colunas corretas
- Certifique-se de que a data está no formato DD/MM/YYYY
- Verifique se há pelo menos 5 colunas (Data, Hora, Competição, Mandante, Visitante)

### "Erro na importação"
- Verifique o console do navegador (F12) para mais detalhes
- Certifique-se de estar logado como admin
- Verifique as regras de segurança do Firestore

### Jogos não aparecem
- Aguarde alguns segundos (o sistema atualiza em tempo real)
- Recarregue a página
- Verifique se os jogos foram realmente salvos no Firestore

## Exemplo Completo

1. **Na planilha**, selecione as linhas 2-25 (ou quantas quiser)
2. **Copie** (Ctrl+C)
3. **No app**, cole no campo de importação
4. **Clique** em "Importar Jogos"
5. **Revise** a pré-visualização
6. **Confirme** a importação

Pronto! Os jogos estarão disponíveis no sistema. 🎉
