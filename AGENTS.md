# Regras Anti-Bug e Boas Práticas (Thor4Tech Studio)

## 1. TypeScript e Tipagem
- Uso de `any` é proibido. Toda prop deve ter interface TypeScript explícita.
- Generics devem ser usados em hooks onde aplicável.

## 2. Hooks e Efeitos
- Hooks SEMPRE no topo, nunca dentro de if/loop.
- Todo `useEffect` deve ter o array de dependências correto.
- Operações de escuta (`onSnapshot`, `addEventListener`, `setInterval`) devem TEMPRE retornar uma função de cleanup.

## 3. Comportamento Assíncrono e SSR
- Verificação de `typeof window !== 'undefined'` é obrigatória antes de acessar `localStorage` ou `sessionStorage`.
- Loading states (esquema skeleton ou spinner) DEVEM existir em TODA operação assíncrona.
- Try/catch é obrigatório em funções assíncronas, com notificação (`toast`) de erro para o usuário em caso de falha.
- Estado de loading global é necessário enquanto `onAuthStateChanged` resolve as credenciais.

## 4. Firestore e Dados
- Toda query no Firestore que usa `where` com `orderBy` ou múltiplos `where` requer um índice (`firestore.indexes.json`).
- Datas devem ser salvas como `firebase.firestore.Timestamp`, nunca como "string ISO".
- Na UI, exiba as datas no formato pt-BR (utilize `date-fns` com o idioma `ptBR`).
- As regras do Firestore devem ser restritas, validando `request.auth != null` e as permissões (roles) de cada usuário.

## 5. UI, Layout e Acessibilidade
- O sistema deve ser responsivo e funcionar até em larguras de 375px (iPhone SE). Em telas menores as sidebars viram drawers e tabelas viram cards.
- Gerenciamento de z-index deve usar a escala padrão: `z-base: 0`, `z-sticky: 10`, `z-dropdown: 20`, `z-overlay: 50`, `z-modal: 60`, `z-toast: 70`, `z-tooltip: 80`.
- Botões que estiverem `disabled` precisam ter o atributo `disabled` E a classe do Tailwind `pointer-events-none`.
- Listas vazias TEMPRE devem ter um "Empty State" com ilustração, mensagem de contexto e um CTA (ação secundária).
- Ícones que funcionam como botões (sem texto) devem ter `aria-label`.
- O foco em abas e botões deve ser plenamente visível (foco de acessibilidade suportado).

## 6. Qualidade de Código
- Imports devem ser agrupados: 1° React, 2° Bibliotecas Externas, 3° Componentes Internos, 4° Utilitários, 5° Tipos.
- Sem imports duplicados.

# Checklist pós-geração
- [ ] O app continua a fazer "build" sem erros.
- [ ] Verificações de tipo passando perfeitamente (`tsc --noEmit`).
- [ ] Linter rodando sem apontar erros (`eslint`).
- [ ] O Console do Browser está isento de erros ou warnings.
- [ ] Interface ajustando bem sob 375px; sem barras de rolagem horizontal quebradas.
- [ ] Componentes interativos possuem estados de carregamento (Loading) e tratamento de erros (Error State) além dos listamentos vazios (Empty States).

# 23 Bugs Comuns do AI Studio + Como Prevenir

## 1. TypeScript / Tipos
- Props sem interface tipada: Toda prop deve ter interface TypeScript explícita. Sem `any` em nenhuma prop.
- Imports duplicados ou ausentes: Agrupar (React → libs externas → componentes internos → utils → tipos). Sem duplicatas.
- `useState<User | null>(null)` sempre tipar explicitamente.

## 2. Hooks e Side Effects
- `useEffect` sem dependency array: Todo `useEffect` deve ter o array correto.
- `useEffect` com dependencies erradas: Listar todas as variáveis lidas.
- State update em componente desmontado: Usar AbortController ou flag `isMounted`.
- Hooks chamados condicionalmente: Sempre no topo do componente.

## 3. Auth e Race Conditions
- Loading state global durante `onAuthStateChanged`. Não renderizar sem saber state.

## 4. SSR / Next.js
- `typeof window !== 'undefined'` obrigatório antes de localStorage/sessionStorage.

## 5. Firestore / Backend
- Gerar index no `firestore.indexes.json` quando queries usam `where` + `orderBy` ou múltiplos `where`.
- Listener Firestore sem unsubscribe: Todo `onSnapshot` precisa de cleanup.
- Salvar datas como `firebase.firestore.Timestamp` e não string ISO.
- Regras rígidas no Firestore validando request.auth.

## 6. UI / Layout
- Z-index: z-base: 0, z-sticky: 10, z-dropdown: 20, z-overlay: 50, z-modal: 60, z-toast: 70, z-tooltip: 80.
- Foco em modal com block.
- Botões disabled precisam do atributo e de `pointer-events-none`.

## 7. Performance
- Re-renders desnecessários usando memo/useCallback.
- Lazy load em componentes pesados.

---

# Responsividade — Especificação Thor4Tech Studio

A tela DEVE funcionar perfeitamente em:
- Mobile portrait: 375x812 (iPhone 14)
- Mobile landscape: 812x375
- Tablet portrait: 768x1024 (iPad)
- Desktop: 1440x900 e acima

**Touch Targets**: Mínimo 44x44px.
**Hover**: Não depender apenas do hover. Usar tap em mobile.
**Menu**: Em mobile a sidebar some e usa o drawer via hamburger. Modais fullscreen para mobile. E bottom navigation fixa.
**Tipografia e Inputs**: min 16px font-size num input pra não ter zoom em iOS.
**Safe Areas**: Padding para `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`.
**100vh**: Usar `100dvh`.
