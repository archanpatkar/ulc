// TDOP/Pratt Parser
// Based on http://crockford.com/javascript/tdop/tdop.html
const tokenize = require("./lexer");

// AST Nodes
const Lam = (param, body) => ({ node: "lambda", param: param, body: body });
const Lit = (type, val) => ({ node: "literal", type: type, val: val });
const Pair = (fst,snd) => ({ node:"pair", fst:fst, snd:snd });
const Var = (name) => ({ node: "var", name: name });
const LetB = (name,exp) => ({ node: "let", name: name, exp:exp });
const App = (lam, param) => ({ node: "apply", exp1: lam, exp2: param });
const Condition = (cond,e1,e2) => ({ node: "condition", cond:cond, exp1: e1, exp2: e2 });
const BinOp = (op, l, r) => ({ node: op, l: l, r: r });
const UnOp = (op,v) => ({ node: op, val: v });

const ops = ["ADD","SUB","DIV","MUL","NEG","EQ"];
const not = ["EOF","RPAREN","TO","DEFT","BODY","THEN","ELSE","COMMA"];

// Error handling can be improved
// Eliminate dead code
const handlers = {
    "COMMA": {
        nud() {
            this.expect(null,"',' is not a unary operator");
        }
    },
    "EQ": {
        nud() {
            this.expect(null,"'=' is not a unary operator");
        },
        led() {
            this.expect(null,"'=' is not a binary operator");
        }
    },
    "IDEN": {
        nud(token) {
            return Var(token.value);
        },
        led(left) {
            this.expect(null,`'${left.name}' not a binary operator`);
        }
    },
    "LIT": {
        nud(token) {
            if (typeof token.value == "number") return Lit("int", token.value);
            return Lit("bool", token.value);
        },
        led(left) {
            this.expect(null,`'${left.val}' not a binary operator`);
        }
    },
    "LPAREN": {
        nud() {
            let exp = this.expression(0);
            if(this.peek().type == "COMMA") {
                this.consume();
                exp = Pair(exp,this.expression(0));
            }
            this.expect("RPAREN", "Unmatched paren '('");
            return exp;
        }
    },
    "LET": {
        nud() {
            const name = this.expect("IDEN","Expected an identifier").value;
            this.expect("EQ","Expected '='");
            const exp = this.expression(0);
            return LetB(name,exp);
        }
    },
    "MUL": {
        lbp:3,
        nud() {
            this.expect(null,"'*' not a unary operator");
        },
        led(left) {
            const right = this.expression(this.lbp);
            return BinOp("MUL",left,right);
        }
    },
    "DIV": {
        lbp:3,
        nud() {
            this.expect(null,"'/' not a unary operator");
        },
        led(left) {
            const right = this.expression(this.lbp);
            return BinOp("DIV",left,right);
        }
    },
    "SUB": {
        rbp:4,
        lbp:2,
        nud() {
            return UnOp("NEG",this.expression(this.rbp));
        },
        led(left) {
            const right = this.expression(this.lbp);
            return BinOp("SUB",left,right);
        }
    },
    "ADD": {
        lbp:2,
        nud() {
            this.expect(null,"'+' not a unary operator");
        },
        led(left) {
            const right = this.expression(this.lbp);
            return BinOp("ADD",left,right);
        }
    },
    "IF": {
        nud() {
            const cond = this.expression(0);
            this.expect("THEN","Expected keyword 'then'");
            const e1 = this.expression(0);
            this.expect("ELSE","Expected keyword 'else'");
            const e2 = this.expression(0);
            return Condition(cond,e1,e2);
        }
    },
    "LAM": {
        nud() {
            const param = this.expression(0);
            if(param.node != "var") this.expect(null,"Expected an identifier");
            this.expect("BODY","Expected '.'");
            const body = this.expression(0);
            return Lam(param.name,body);
        }
    },
    "APPLY": {
        lbp:5,
        led(left) {
            const right = this.expression(this.lbp);
            return App(left,right);
        }
    }
}

function multiThis(func,...obj) {
    let merged = new Proxy({ all: obj }, {
        set(target,key,value) {
            let o = undefined;
            for(let e of target.all) {
                if(e[key]) {
                    o = e[key] = value;
                    break;
                }
            }
            return o;
        },
        get(target,key) {
            let o = undefined;
            for(let e of target.all) {
                if(e[key]) {
                    o = e[key];
                    break;
                }
            }
            return o;
        }
    });
    return func.bind(merged);
}

class Parser {
    constructor() {}

    consume() {
        return this.tokens.shift();
    }

    peek() {
        return this.tokens[0];
    }

    expect(next, msg) {
        if (next && this.peek().type == next)
            return this.consume();
        throw new Error(msg);
    }

    expression(min,pleft) {
        let left = pleft;
        let token = this.peek();
        if(token.type == "EOF") this.expect(null,"Unexpected end");
        if(handlers[token.type] && !left) {
            token = this.consume();
            left = multiThis(handlers[token.type].nud,handlers[token.type],this)(token);
        }
        token = this.peek();
        while(ops.includes(token.type) && min <= handlers[token.type].lbp && token.value != 0) {
            token = this.consume();
            left = multiThis(handlers[token.type].led,handlers[token.type],this)(left);
            token = this.peek();
        }
        token = this.peek();
        while(!not.includes(token.type) && !ops.includes(token.type) && min < handlers["APPLY"].lbp && token.value != 0) {
            left = multiThis(handlers["APPLY"].led,handlers["APPLY"],this)(left);
            token = this.peek();
            if(ops.includes(token.type)) left = this.expression(0,left);
        }
        return left;
    }
    parse(str) {
        this.tokens = tokenize(str);
        return this.expression(0);
    }
}

module.exports = Parser;