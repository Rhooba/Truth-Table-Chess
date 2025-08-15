class TruthTableCheckers {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'player';
        this.selectedPiece = null;
        this.gameState = 'playing';
        this.playerScore = 0;
        this.aiScore = 0;
        this.currentChallenge = null;
        this.timer = null;
        this.timeLeft = 30;
        
        this.initializeGame();
        this.setupEventListeners();
    }

    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place player pieces (bottom 3 rows)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = {
                        type: 'player',
                        operator: this.getRandomOperator(),
                        isKing: false
                    };
                }
            }
        }
        
        // Place AI pieces (top 3 rows)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    board[row][col] = {
                        type: 'ai',
                        operator: this.getRandomOperator(),
                        isKing: false
                    };
                }
            }
        }
        
        return board;
    }

    getRandomOperator() {
        const operators = ['AND', 'OR', 'NOT', 'IMPLIES', 'BICONDITIONAL', 'COMPLEX'];
        return operators[Math.floor(Math.random() * operators.length)];
    }

    initializeGame() {
        this.renderBoard();
        this.updateScore();
    }

    renderBoard() {
        const boardElement = document.getElementById('checkers-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.type} ${piece.isKing ? 'king' : ''}`;
                    pieceElement.textContent = this.getOperatorSymbol(piece.operator);
                    square.appendChild(pieceElement);
                }

                square.addEventListener('click', (e) => this.handleSquareClick(row, col, e));
                boardElement.appendChild(square);
            }
        }
    }

    getOperatorSymbol(operator) {
        const symbols = {
            'AND': '∧',
            'OR': '∨',
            'NOT': '¬',
            'IMPLIES': '→',
            'BICONDITIONAL': '↔',
            'COMPLEX': '⚡'
        };
        return symbols[operator] || '?';
    }

    handleSquareClick(row, col, event) {
        if (this.gameState !== 'playing' || this.currentPlayer !== 'player') return;

        const piece = this.board[row][col];
        
        if (this.selectedPiece) {
            // Try to move selected piece
            if (this.isValidMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                this.showChallenge(this.selectedPiece.row, this.selectedPiece.col, row, col);
            } else {
                this.clearSelection();
            }
        } else if (piece && piece.type === 'player') {
            // Select piece
            this.selectedPiece = { row, col, piece };
            this.highlightValidMoves(row, col);
        }
    }

    isValidMove(fromRow, fromCol, toRow, toCol) {
        // Basic checkers movement rules
        const piece = this.board[fromRow][fromCol];
        const target = this.board[toRow][toCol];
        
        if (target !== null) return false; // Can't move to occupied square
        
        const rowDiff = toRow - fromRow;
        const colDiff = Math.abs(toCol - fromCol);
        
        // Regular pieces can only move forward (up for player)
        if (!piece.isKing && piece.type === 'player' && rowDiff >= 0) return false;
        if (!piece.isKing && piece.type === 'ai' && rowDiff <= 0) return false;
        
        // Must move diagonally
        if (Math.abs(rowDiff) !== colDiff) return false;
        
        // Single step or capture
        if (Math.abs(rowDiff) === 1) return true;
        if (Math.abs(rowDiff) === 2) {
            // Check for capture
            const midRow = fromRow + rowDiff / 2;
            const midCol = fromCol + (toCol - fromCol) / 2;
            const capturedPiece = this.board[midRow][midCol];
            return capturedPiece && capturedPiece.type !== piece.type;
        }
        
        return false;
    }

    highlightValidMoves(row, col) {
        this.clearHighlights();
        
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('highlighted');
        
        // Highlight valid moves
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isValidMove(row, col, r, c)) {
                    const targetSquare = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    targetSquare.classList.add('valid-move');
                }
            }
        }
    }

    clearHighlights() {
        document.querySelectorAll('.square').forEach(square => {
            square.classList.remove('highlighted', 'valid-move');
        });
    }

    clearSelection() {
        this.selectedPiece = null;
        this.clearHighlights();
    }

    showChallenge(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        this.currentComplexExpression = null; // Reset for new challenge
        this.currentChallenge = {
            fromRow, fromCol, toRow, toCol,
            operator: piece.operator,
            answer: null
        };

        const challenge = this.generateTruthTableChallenge(piece.operator);
        this.displayChallenge(challenge);
        this.startTimer();
    }

    generateTruthTableChallenge(operator) {
        const variables = ['P', 'Q'];
        const rows = [
            [true, true],
            [true, false],
            [false, true],
            [false, false]
        ];

        // For IMPLIES, randomly choose between P→Q, P→¬Q, ¬P→Q, etc.
        let implicationVariant = null;
        if (operator === 'IMPLIES') {
            const variants = ['P→Q', 'P→¬Q', '¬P→Q', '¬P→¬Q'];
            implicationVariant = variants[Math.floor(Math.random() * variants.length)];
        }

        const challenge = {
            operator,
            variables,
            implicationVariant,
            rows: rows.map(row => ({
                inputs: row,
                output: this.evaluateImplicationVariant(operator, row[0], row[1], implicationVariant)
            })),
            question: null,
            options: [],
            correctAnswer: null
        };

        // Create a question by hiding one output
        const hiddenIndex = Math.floor(Math.random() * 4);
        challenge.question = hiddenIndex;
        challenge.correctAnswer = challenge.rows[hiddenIndex].output;

        // Generate multiple choice options
        challenge.options = [
            { text: 'True', value: true },
            { text: 'False', value: false }
        ];

        // Store challenge data for later use
        this.currentChallengeData = challenge;
        return challenge;
    }

    evaluateExpression(operator, p, q) {
        switch (operator) {
            case 'AND': return p && q;
            case 'OR': return p || q;
            case 'NOT': return !p; // Only use first variable for NOT
            case 'IMPLIES': return !p || q; // P → Q is equivalent to ¬P ∨ Q
            case 'BICONDITIONAL': return p === q; // P ↔ Q is true when both have same value
            case 'COMPLEX': return this.evaluateComplexExpression(p, q);
            default: return false;
        }
    }

    evaluateImplicationVariant(operator, p, q, variant) {
        if (operator !== 'IMPLIES') {
            return this.evaluateExpression(operator, p, q);
        }
        
        switch (variant) {
            case 'P→Q': return !p || q;      // P implies Q
            case 'P→¬Q': return !p || !q;    // P implies not Q
            case '¬P→Q': return p || q;      // not P implies Q
            case '¬P→¬Q': return p || !q;    // not P implies not Q
            default: return !p || q;
        }
    }

    evaluateComplexExpression(p, q) {
        // Generate random complex expressions
        const expressions = [
            () => (p && q) || (!p && !q), // (P ∧ Q) ∨ (¬P ∧ ¬Q)
            () => !p || (p && q), // ¬P ∨ (P ∧ Q)
            () => (p || q) && !(p && q), // (P ∨ Q) ∧ ¬(P ∧ Q) - XOR equivalent
            () => (!p || q) && (!q || p), // (¬P ∨ Q) ∧ (¬Q ∨ P)
            () => !(p && !q), // ¬(P ∧ ¬Q)
        ];
        
        if (!this.currentComplexExpression) {
            this.currentComplexExpression = Math.floor(Math.random() * expressions.length);
        }
        
        return expressions[this.currentComplexExpression]();
    }

    getComplexExpressionString() {
        const expressions = [
            '(P ∧ Q) ∨ (¬P ∧ ¬Q)',
            '¬P ∨ (P ∧ Q)',
            '(P ∨ Q) ∧ ¬(P ∧ Q)',
            '(¬P ∨ Q) ∧ (¬Q ∨ P)',
            '¬(P ∧ ¬Q)'
        ];
        return expressions[this.currentComplexExpression || 0];
    }

    getTruthTableHeader(operator) {
        switch (operator) {
            case 'AND': return 'P ∧ Q';
            case 'OR': return 'P ∨ Q';
            case 'NOT': return '¬P';
            case 'IMPLIES': return this.currentChallengeData?.implicationVariant || 'P → Q';
            case 'BICONDITIONAL': return 'P ↔ Q';
            case 'COMPLEX': return this.getComplexExpressionString();
            default: return 'Result';
        }
    }

    displayChallenge(challenge) {
        const container = document.getElementById('challenge-container');
        const questionDiv = document.getElementById('challenge-question');
        const optionsDiv = document.getElementById('challenge-options');

        // Build truth table HTML
        let tableHTML = `
            <div class="truth-table">
                <p><strong>Complete the truth table for ${challenge.operator === 'COMPLEX' ? 'complex expression' : challenge.operator} operation:</strong></p>
                ${challenge.operator === 'COMPLEX' ? `<p><em>Expression: ${this.getComplexExpressionString()}</em></p>` : ''}
                <table>
                    <thead>
                        <tr>
                            <th>P</th>
                            <th>Q</th>
                            <th>${this.getTruthTableHeader(challenge.operator)}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        challenge.rows.forEach((row, index) => {
            const output = index === challenge.question ? '?' : (row.output ? 'T' : 'F');
            tableHTML += `
                <tr>
                    <td>${row.inputs[0] ? 'T' : 'F'}</td>
                    <td>${row.inputs[1] ? 'T' : 'F'}</td>
                    <td style="background-color: ${index === challenge.question ? '#ffeb3b' : 'transparent'}">${output}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table></div>';
        questionDiv.innerHTML = tableHTML;

        // Display options
        optionsDiv.innerHTML = '';
        challenge.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option.text;
            button.onclick = () => this.selectOption(button, option.value);
            optionsDiv.appendChild(button);
        });

        container.classList.remove('hidden');
    }

    selectOption(button, value) {
        document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        this.currentChallenge.answer = value;
    }

    startTimer() {
        this.timeLeft = 30;
        this.updateTimer();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            
            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    updateTimer() {
        document.getElementById('timer').textContent = this.timeLeft;
    }

    timeUp() {
        clearInterval(this.timer);
        const correctAnswer = this.currentChallengeData ? this.currentChallengeData.correctAnswer : false;
        const explanation = this.getLogicalExplanation(this.currentChallengeData);
        this.showResult(false, `Time's up! The answer was ${correctAnswer ? 'True' : 'False'}.<br><br><strong>Explanation:</strong><br>${explanation}`);
    }

    getLogicalExplanation(challenge) {
        // Use stored challenge data if challenge parameter is incomplete
        const challengeData = challenge || this.currentChallengeData;
        if (!challengeData || !challengeData.rows) {
            return "Unable to provide explanation - challenge data missing.";
        }
        
        const { operator, rows, question } = challengeData;
        const questionRow = rows[question];
        const p = questionRow.inputs[0];
        const q = questionRow.inputs[1];
        const result = questionRow.output;
        
        let explanation = "";
        
        switch (operator) {
            case 'AND':
                explanation = `<strong>Conjunction (AND) Rule:</strong><br>`;
                explanation += `P ∧ Q is true only when both P and Q are true.<br>`;
                explanation += `Since P = ${p ? 'True' : 'False'} and Q = ${q ? 'True' : 'False'}, `;
                if (p && q) {
                    explanation += `both are true, so P ∧ Q = True.`;
                } else {
                    explanation += `at least one is false, so P ∧ Q = False.`;
                }
                break;
                
            case 'OR':
                explanation = `<strong>Disjunction (OR) Rule:</strong><br>`;
                explanation += `P ∨ Q is true when at least one of P or Q is true.<br>`;
                explanation += `Since P = ${p ? 'True' : 'False'} and Q = ${q ? 'True' : 'False'}, `;
                if (p || q) {
                    explanation += `at least one is true, so P ∨ Q = True.`;
                } else {
                    explanation += `both are false, so P ∨ Q = False.`;
                }
                break;
                
            case 'NOT':
                explanation = `<strong>Negation (NOT) Rule:</strong><br>`;
                explanation += `¬P is true when P is false, and false when P is true.<br>`;
                explanation += `Since P = ${p ? 'True' : 'False'}, `;
                explanation += `¬P = ${!p ? 'True' : 'False'}.`;
                break;
                
            case 'IMPLIES':
                const variant = challengeData.implicationVariant || 'P→Q';
                explanation = `<strong>Implication (→) Rule:</strong><br>`;
                explanation += `${variant} is false only when the antecedent is true and the consequent is false.<br>`;
                explanation += `Since P = ${p ? 'True' : 'False'} and Q = ${q ? 'True' : 'False'}:<br>`;
                
                switch (variant) {
                    case 'P→Q':
                        explanation += `P → Q is ${result ? 'True' : 'False'} because `;
                        explanation += (p && !q) ? 'P is true and Q is false.' : 'the implication holds.';
                        break;
                    case 'P→¬Q':
                        explanation += `P → ¬Q is ${result ? 'True' : 'False'} because `;
                        explanation += (p && q) ? 'P is true and ¬Q is false (Q is true).' : 'the implication holds.';
                        break;
                    case '¬P→Q':
                        explanation += `¬P → Q is ${result ? 'True' : 'False'} because `;
                        explanation += (!p && !q) ? '¬P is true (P is false) and Q is false.' : 'the implication holds.';
                        break;
                    case '¬P→¬Q':
                        explanation += `¬P → ¬Q is ${result ? 'True' : 'False'} because `;
                        explanation += (!p && q) ? '¬P is true (P is false) and ¬Q is false (Q is true).' : 'the implication holds.';
                        break;
                }
                break;
                
            case 'BICONDITIONAL':
                explanation = `<strong>Biconditional (If and Only If ↔) Rule:</strong><br>`;
                explanation += `P ↔ Q is true when P and Q have the same truth value.<br>`;
                explanation += `Since P = ${p ? 'True' : 'False'} and Q = ${q ? 'True' : 'False'}, `;
                if (p === q) {
                    explanation += `both have the same value, so P ↔ Q = True.`;
                } else {
                    explanation += `they have different values, so P ↔ Q = False.`;
                }
                break;
                
            case 'COMPLEX':
                explanation = `<strong>Complex Expression Rule:</strong><br>`;
                explanation += `Expression: ${this.getComplexExpressionString()}<br>`;
                explanation += `For P = ${p ? 'True' : 'False'} and Q = ${q ? 'True' : 'False'}:<br>`;
                explanation += `Evaluate step by step following operator precedence and parentheses.<br>`;
                explanation += `Result: ${result ? 'True' : 'False'}`;
                break;
                
            default:
                explanation = `The correct answer is ${result ? 'True' : 'False'}.`;
        }
        
        return explanation;
    }

    submitAnswer() {
        if (!this.currentChallenge || this.currentChallenge.answer === null) {
            alert('Please select an answer first!');
            return;
        }

        clearInterval(this.timer);
        const correctAnswer = this.currentChallengeData ? this.currentChallengeData.correctAnswer : this.currentChallenge.correctAnswer;
        const isCorrect = this.currentChallenge.answer === correctAnswer;
        
        if (isCorrect) {
            this.executeMove();
            this.playerScore += 2;
            this.showResult(true, "Correct! Great job!");
        } else {
            const explanation = this.getLogicalExplanation(this.currentChallengeData);
            this.showResult(false, `Incorrect. The answer was ${correctAnswer ? 'True' : 'False'}.<br><br><strong>Explanation:</strong><br>${explanation}`);
        }
    }

    executeMove() {
        const { fromRow, fromCol, toRow, toCol } = this.currentChallenge;
        const piece = this.board[fromRow][fromCol];
        
        // Check for capture
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        if (Math.abs(rowDiff) === 2) {
            const midRow = fromRow + rowDiff / 2;
            const midCol = fromCol + colDiff / 2;
            this.board[midRow][midCol] = null; // Remove captured piece
            this.playerScore += 5;
        }
        
        // Move piece
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Check for king promotion
        if (piece.type === 'player' && toRow === 0) {
            piece.isKing = true;
        }
        
        this.renderBoard();
    }

    showResult(isCorrect, message) {
        const container = document.getElementById('challenge-container');
        const resultPanel = document.getElementById('result-panel');
        const resultMessage = document.getElementById('result-message');
        
        container.classList.add('hidden');
        resultPanel.className = `result-panel ${isCorrect ? 'correct' : 'incorrect'}`;
        resultMessage.innerHTML = `<h3>${message}</h3>`;
        resultPanel.classList.remove('hidden');
        
        this.updateScore();
    }

    continueGame() {
        document.getElementById('result-panel').classList.add('hidden');
        this.clearSelection();
        this.currentChallenge = null;
        
        if (this.currentPlayer === 'player') {
            this.currentPlayer = 'ai';
            setTimeout(() => this.aiTurn(), 1000);
        } else {
            this.currentPlayer = 'player';
        }
    }

    aiTurn() {
        // Simple AI: make a random valid move
        const aiPieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'ai') {
                    aiPieces.push({ row, col, piece });
                }
            }
        }
        
        if (aiPieces.length === 0) {
            this.endGame('player');
            return;
        }
        
        // Find valid moves for AI
        const validMoves = [];
        aiPieces.forEach(({ row, col }) => {
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    if (this.isValidMove(row, col, r, c)) {
                        validMoves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
                    }
                }
            }
        });
        
        if (validMoves.length === 0) {
            this.endGame('player');
            return;
        }
        
        // AI makes a random move (always "solves" the problem correctly)
        const move = validMoves[Math.floor(Math.random() * validMoves.length)];
        const piece = this.board[move.fromRow][move.fromCol];
        
        // Check for capture
        const rowDiff = move.toRow - move.fromRow;
        const colDiff = move.toCol - move.fromCol;
        if (Math.abs(rowDiff) === 2) {
            const midRow = move.fromRow + rowDiff / 2;
            const midCol = move.fromCol + colDiff / 2;
            this.board[midRow][midCol] = null;
            this.aiScore += 5;
        }
        
        // Move piece
        this.board[move.toRow][move.toCol] = piece;
        this.board[move.fromRow][move.fromCol] = null;
        
        // Check for king promotion
        if (piece.type === 'ai' && move.toRow === 7) {
            piece.isKing = true;
        }
        
        this.aiScore += 2;
        this.renderBoard();
        this.updateScore();
        this.currentPlayer = 'player';
    }

    skipChallenge() {
        clearInterval(this.timer);
        this.playerScore = Math.max(0, this.playerScore - 1);
        const correctAnswer = this.currentChallengeData ? this.currentChallengeData.correctAnswer : false;
        const explanation = this.getLogicalExplanation(this.currentChallengeData);
        this.showResult(false, `Challenge skipped. -1 point.<br><br>The answer was ${correctAnswer ? 'True' : 'False'}.<br><br><strong>Explanation:</strong><br>${explanation}`);
    }

    updateScore() {
        document.getElementById('player-score').textContent = this.playerScore;
        document.getElementById('ai-score').textContent = this.aiScore;
    }

    newGame() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'player';
        this.selectedPiece = null;
        this.gameState = 'playing';
        this.playerScore = 0;
        this.aiScore = 0;
        this.currentChallenge = null;
        
        document.getElementById('challenge-container').classList.add('hidden');
        document.getElementById('result-panel').classList.add('hidden');
        
        this.initializeGame();
    }

    endGame(winner) {
        this.gameState = 'ended';
        alert(`Game Over! ${winner === 'player' ? 'You win!' : 'AI wins!'}`);
    }

    setupEventListeners() {
        document.getElementById('submit-answer').addEventListener('click', () => this.submitAnswer());
        document.getElementById('skip-challenge').addEventListener('click', () => this.skipChallenge());
        document.getElementById('continue-game').addEventListener('click', () => this.continueGame());
        document.getElementById('new-game').addEventListener('click', () => this.newGame());
        
        // Rules modal
        const rulesBtn = document.getElementById('rules');
        const modal = document.getElementById('rules-modal');
        const closeBtn = document.querySelector('.close');
        
        rulesBtn.addEventListener('click', () => modal.classList.remove('hidden'));
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });
        
        // Hint button (placeholder)
        document.getElementById('hint').addEventListener('click', () => {
            alert('Hint: Remember the basic truth table rules for each operator!');
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TruthTableCheckers();
});
