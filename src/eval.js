// Evaluater
const Parser = require("./parser");

// Eval types
const need = 0;
const name = 1;
const value = 2;

class Env {
    constructor(params, args, outer = null, obj = null) {
        if (obj == null) {
            this.env = {};
            for (let i in args) {
                this.env[params[i]] = args[i];
            }
        } else {
            this.env = obj;
        }
        this.outer = outer;
    }

    find(variable) {
        if (variable in this.env) {
            return this.env[variable];
        } else if (this.outer) {
            return this.outer.find(variable);
        }
        throw new Error("No such binding");
    }

    update(variable, value) {
        if (variable in this.env) {
            this.env[variable] = value;
            return this.env[variable];
        } else if (this.outer) {
            return this.outer.update(variable, value);
        }
    }

    create(variable, value) {
        if(!this.env[variable]) return this.env[variable] = value;
        throw new Error("Cannot redefine let binding");
    }
}

class Thunk {
    constructor(exp, env = null,intp) {
        this.exp = exp;
        this.scope = env;
        this.reduced = false;
        this.intp = intp;
    }

    value() {
        return this.intp.ieval(this.exp, this.scope);
    }

    reduce() {
        if(!this.reduced)
        {
            this.exp = this.intp.ieval(this.exp, this.scope);
            this.reduced = true;
        }
        return this.exp;
    }

    toString() {
        return `<thunk>`;   
    }
}

class Lambda {
    constructor(body, param, env = null, intp) {
        this.body = body;
        this.param = param;
        this.scope = env;
        this.intp = intp;
    }

    apply(actual) {
        let frame = new Env(null, null, this.scope, {});
        frame.create(this.param, actual);
        const out = this.intp.ieval(this.body, frame);
        return out;
    }

    toString() {
        return this.scope && this.scope != GLOBAL?"<closure>":"<lambda>";   
    }
}

function pair(fst,snd) {
    this[0] = fst;
    this[1] = snd;
}

pair.prototype.toString = function() {
    return `(${this[0]},${this[1]})`
}

function globalEnv() {
    const env = new Env();
    env.create("fst",{ apply: v => v[0] });
    env.create("snd",{ apply: v => v[1] });
    env.create("print",{ apply: v => console.log(v) });
    return env;
}

const GLOBAL = globalEnv();

class Interpreter { 
    constructor(global) {
        this.parser = new Parser();
        this.mode = value;
        this.global = global?global:GLOBAL;
    }

    setMode(mode) {
        this.mode = mode;
    }

    ieval(ast, env) {
        // console.log(ast)
        if (ast.node == "literal") return ast.val;
        else if (ast.node == "pair") return new pair(
            this.ieval(ast.fst,env),
            this.ieval(ast.snd,env)
        );
        else if(ast.node == "let") {
            return env.create(ast.name,this.ieval(ast.exp,env))
        }
        else if (ast.node == "var")  {
            const v = env.find(ast.name);
            if (v instanceof Thunk) {
                if(this.mode == name) return v.value();
                else return v.reduce();
            }
            return v;
        }
        else if (ast.node == "condition") {
            const cond = this.ieval(ast.cond, env);
            // console.log("testing if");
            // console.log(cond);
            if (cond) return this.ieval(ast.exp1, env);
            else return this.ieval(ast.exp2, env);
        }
        else if (ast.node == "lambda") {
            return new Lambda(ast.body, ast.param, env, this);
        }
        else if (ast.node == "apply") {
            const lam = this.ieval(ast.exp1,env);
            // console.log(ast)
            // console.log("-----")
            // console.log(lam)
            // console.log(lam.apply)
            if(this.mode == value) return lam.apply(this.ieval(ast.exp2,env));
            return lam.apply(new Thunk(ast.exp2,env,this));
        }
        else if (ast.node == "ADD") 
            return this.ieval(ast.l, env) + this.ieval(ast.r, env);
        else if (ast.node == "SUB") 
            return this.ieval(ast.l, env) - this.ieval(ast.r, env);
        else if (ast.node == "MUL") 
            return this.ieval(ast.l, env) * this.ieval(ast.r, env);
        else if (ast.node == "DIV") 
            return this.ieval(ast.l, env) / this.ieval(ast.r, env);
        else if (ast.node == "NEG") return -this.ieval(ast.val,env);
    }

    evaluate(str) {
        const ast = this.parser.parse(str);
        return this.ieval(ast,this.global);
    }
}

module.exports =  {
    Interpreter:Interpreter, 
    modes: {
        "need":need,
        "name":name,
        "value":value
    }
};