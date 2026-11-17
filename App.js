import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, SafeAreaView } from 'react-native';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';


const G = 9.81;
const num = (s) => parseFloat(String(s).trim().replace(',', '.'));
const f = (n, d = 3) => (Number.isFinite(n) ? n.toFixed(d).replace('.', ',') : '—');
const parseList = (s) => s.split(/[\s;]+/).map(num).filter(Number.isFinite);

/* ---------- hook de sensor ---------- */
function useSensor(Sensor, ms = 100) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const ref = useRef({ x: 0, y: 0, z: 0 });
  useEffect(() => {
    Sensor.setUpdateInterval(ms);
    const sub = Sensor.addListener((d) => { ref.current = d; setData(d); });
    return () => sub.remove();
  }, []);
  return [data, ref];
}

/* ---------- componentes básicos ---------- */
const Card = ({ title, children }) => (
  <View style={s.card}>
    {title ? <Text style={s.cardTitle}>{title}</Text> : null}
    {children}
  </View>
);
const Btn = ({ label, onPress, color }) => (
  <TouchableOpacity style={[s.btn, color && { backgroundColor: color }]} onPress={onPress}>
    <Text style={s.btnTxt}>{label}</Text>
  </TouchableOpacity>
);
const Field = ({ label, value, onChangeText, multiline, width }) => (
  <View style={{ marginVertical: 4 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput style={[s.input, multiline && { height: 90 }, width && { width }]} value={value}
      onChangeText={onChangeText} multiline={multiline} />
  </View>
);
const Txt = ({ children, bold }) => <Text style={[s.txt, bold && { fontWeight: '700' }]}>{children}</Text>;
const Xyz = ({ d, unit = 'g' }) => (
  <Text style={s.mono}>X = {f(d.x)}  Y = {f(d.y)}  Z = {f(d.z)} {unit}</Text>
);

/* ---------- EX 1 ---------- */
function Ex1() {
  const [a] = useSensor(Accelerometer);
  const [reads, setReads] = useState([]);
  const axes = ['x', 'y', 'z'];
  const big = axes.reduce((m, k) => (Math.abs(a[k]) > Math.abs(a[m]) ? k : m), 'x');
  return (
    <>
      <Card title="Previsão (anote antes!)">
        <Txt>Desenhe o celular no papel com X, Y e Z. Preveja qual eixo terá o maior valor absoluto e o sinal. Só depois registre as leituras.</Txt>
      </Card>
      <Card title="Leitura ao vivo (g)">
        <Xyz d={a} />
        <Txt>Maior valor absoluto agora: eixo {big.toUpperCase()}</Txt>
        <Txt>|a| = {f(Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2))} g</Txt>
        <Btn label={`Registrar leitura (${reads.length}/5)`} onPress={() => reads.length < 5 && setReads([...reads, { ...a }])} />
        <Btn label="Limpar" color="#888" onPress={() => setReads([])} />
      </Card>
      <Card title="Leituras registradas">
        {reads.map((r, i) => (
          <Text key={i} style={s.mono}>Leitura {i + 1}: X = {f(r.x)}  Y = {f(r.y)}  Z = {f(r.z)}</Text>
        ))}
        <Txt>Depois repita com a tela para baixo e compare os sinais.</Txt>
      </Card>
    </>
  );
}

/* ---------- EX 2 ---------- */
function Ex2() {
  const [, ref] = useSensor(Accelerometer, 50);
  const [hyp, setHyp] = useState('');
  const [busy, setBusy] = useState(null);
  const [res, setRes] = useState({});
  const run = (name) => {
    const samples = [];
    setBusy(name);
    const id = setInterval(() => samples.push({ ...ref.current }), 50);
    setTimeout(() => {
      clearInterval(id);
      const avg = (arr, k) => arr.reduce((t, p) => t + p[k], 0) / arr.length;
      const ini = samples.slice(0, 5), fin = samples.slice(-5);
      const out = {};
      ['x', 'y', 'z'].forEach((k) => {
        const base = avg(ini, k);
        out[k] = {
          pico: Math.max(...samples.map((p) => Math.abs(p[k] - base))),
          final: Math.abs(avg(fin, k) - base),
        };
      });
      const maxAxis = ['x', 'y', 'z'].reduce((m, k) => (out[k].pico > out[m].pico ? k : m), 'x');
      const perm = ['x', 'y', 'z'].some((k) => out[k].final > 0.15);
      setRes((r) => ({ ...r, [name]: { out, maxAxis, perm, n: samples.length } }));
      setBusy(null);
    }, 5000);
  };
  return (
    <>
      <Card title="Hipótese (escreva ANTES de testar)">
        <Field label="Minha hipótese para A e B" value={hyp} onChangeText={setHyp} multiline />
      </Card>
      <Card title="Experimentos (5 s cada)">
        <Txt>Aperte o botão e faça o movimento durante a contagem. A = desloca rápido p/ direita e volta. B = inclina devagar p/ direita e fica parado.</Txt>
        <Btn label={busy === 'A' ? 'Gravando A…' : 'Gravar Experiência A'} onPress={() => !busy && run('A')} />
        <Btn label={busy === 'B' ? 'Gravando B…' : 'Gravar Experiência B'} onPress={() => !busy && run('B')} />
      </Card>
      {Object.entries(res).map(([name, r]) => (
        <Card key={name} title={`Resultado ${name} (${r.n} amostras)`}>
          {['x', 'y', 'z'].map((k) => (
            <Text key={k} style={s.mono}>{k.toUpperCase()}: variação máx. = {f(r.out[k].pico)} g | diferença final = {f(r.out[k].final)} g</Text>
          ))}
          <Txt bold>Eixo mais alterado: {r.maxAxis.toUpperCase()}</Txt>
          <Txt bold>{r.perm ? 'A alteração PERMANECEU (compatível com inclinação: a gravidade mudou de eixo).' : 'A alteração foi MOMENTÂNEA (compatível com aceleração do movimento).'}</Txt>
        </Card>
      ))}
      <Card title="Lembre-se de responder no relatório">
        <Txt>Em qual experiência a gravidade pesou mais? Uma única leitura distingue movimento de inclinação? Escreva sua regra sobre a frase “valor ≠ 0 = movimento”.</Txt>
      </Card>
    </>
  );
}

/* ---------- EX 3 ---------- */
function Ex3() {
  const [v, setV] = useState({ x: '0,30', y: '0,40', z: '0,80' });
  const xs = ['x', 'y', 'z'].map((k) => num(v[k]));
  const sq = xs.map((n) => n * n);
  const sum = sq.reduce((a, b) => a + b, 0);
  const mod = Math.sqrt(sum);
  return (
    <>
      <Card title="Valores em g">
        {['x', 'y', 'z'].map((k) => (
          <Field key={k} label={k.toUpperCase()} value={v[k]} onChangeText={(t) => setV({ ...v, [k]: t })} width={120} />
        ))}
      </Card>
      <Card title="1) Conversão para m/s²">
        {xs.map((n, i) => (
          <Text key={i} style={s.mono}>{'XYZ'[i]} = {f(n, 2)} × {G} = {f(n * G, 3)} m/s²</Text>
        ))}
      </Card>
      <Card title="2–4) Módulo">
        <Text style={s.mono}>X² + Y² + Z² = {sq.map((n) => f(n, 2)).join(' + ')} = {f(sum, 2)}</Text>
        <Text style={s.mono}>|a| = √{f(sum, 2)} = {f(mod, 4)} g</Text>
        <Text style={s.mono}>|a| = {f(mod, 4)} × {G} = {f(mod * G, 3)} m/s²</Text>
      </Card>
      <Card title="5) Comparação com 1 g">
        <Txt>Diferença: {f(mod - 1, 4)} g ({f(((mod - 1) / 1) * 100, 1)} %). Se |a| ≈ 1 g, é provável que o aparelho esteja parado, com a gravidade distribuída entre os eixos.</Txt>
      </Card>
    </>
  );
}

/* ---------- EX 4 ---------- */
const classify = (v, neg, pos) => (v < neg ? 'Inclinado para um lado' : v > pos ? 'Inclinado para o outro lado' : 'Posição aproximadamente central');
function Ex4() {
  const [a] = useSensor(Accelerometer);
  const [neg, setNeg] = useState('-0,15');
  const [pos, setPos] = useState('0,15');
  const [vals, setVals] = useState('-0,72 -0,48 -0,12 0,03 0,19 0,51 0,76');
  const n = num(neg), p = num(pos);
  return (
    <>
      <Card title="Limites (escolha e justifique no relatório)">
        <Field label="Limite inferior (negativo)" value={neg} onChangeText={setNeg} width={120} />
        <Field label="Limite superior (positivo)" value={pos} onChangeText={setPos} width={120} />
        <Text style={s.mono}>{'Se X < ' + neg + ' → lado 1\nSe X > ' + pos + ' → lado 2\nCaso contrário → central'}</Text>
      </Card>
      <Card title="Classificação dos valores">
        <Field label="Valores (separe por espaço)" value={vals} onChangeText={setVals} />
        {parseList(vals).map((v, i) => (
          <Text key={i} style={s.mono}>{f(v, 2)} → {classify(v, n, p)}</Text>
        ))}
      </Card>
      <Card title="Ao vivo (eixo X do acelerômetro)">
        <Text style={s.mono}>X = {f(a.x)}</Text>
        <Txt bold>{classify(a.x, n, p)}</Txt>
        <Txt>Teste limites muito pequenos (instável/trêmulo) e muito grandes (nunca detecta inclinação) e anote.</Txt>
      </Card>
    </>
  );
}

/* ---------- EX 5 ---------- */
function Ex5() {
  const [seq, setSeq] = useState('0,47 0,49 0,51 0,52 0,50 0,48 0,51 0,49 0,53 0,47');
  const [lig, setLig] = useState('0,55');
  const [des, setDes] = useState('0,45');
  const vs = parseList(seq);
  const simple = vs.map((v) => v > 0.5);
  let st = false;
  const hist = vs.map((v) => { if (!st && v > num(lig)) st = true; else if (st && v < num(des)) st = false; return st; });
  const changes = (arr) => arr.reduce((c, x, i) => c + (i > 0 && x !== arr[i - 1] ? 1 : 0), 0);
  return (
    <>
      <Card title="Sequência">
        <Field label="Leituras" value={seq} onChangeText={setSeq} multiline />
        <Field label="Limite para LIGAR" value={lig} onChangeText={setLig} width={120} />
        <Field label="Limite para DESLIGAR" value={des} onChangeText={setDes} width={120} />
      </Card>
      <Card title="Regra simples (X > 0,50)">
        {vs.map((v, i) => <Text key={i} style={s.mono}>{f(v, 2)} → {simple[i] ? 'LIGADO' : 'desligado'}</Text>)}
        <Txt bold>Mudanças de estado: {changes(simple)}</Txt>
      </Card>
      <Card title="Regra com histerese">
        {vs.map((v, i) => <Text key={i} style={s.mono}>{f(v, 2)} → {hist[i] ? 'LIGADO' : 'desligado'}</Text>)}
        <Txt bold>Mudanças de estado: {changes(hist)}</Txt>
        <Txt>Desvantagem a discutir: o alerta responde com atraso e exige variação maior para trocar de estado.</Txt>
      </Card>
    </>
  );
}

/* ---------- EX 6 ---------- */
function Ex6() {
  const [txt, setTxt] = useState('0,40 0,20\n0,80 0,10\n1,20 0,15\n0,50 0,30\n-0,30 0,20');
  const rows = txt.split('\n').map((l) => parseList(l)).filter((r) => r.length === 2);
  const d = rows.map(([w, dt]) => w * dt);
  const tot = d.reduce((a, b) => a + b, 0);
  const iMax = d.reduce((m, x, i) => (Math.abs(x) > Math.abs(d[m]) ? i : m), 0);
  return (
    <>
      <Card title="Intervalos (uma linha: ω Δt)">
        <Field label="ω (rad/s) e Δt (s)" value={txt} onChangeText={setTxt} multiline />
      </Card>
      <Card title="Cálculos Δθ = ω × Δt">
        {rows.map(([w, dt], i) => (
          <Text key={i} style={s.mono}>Int. {i + 1}: {f(w, 2)} × {f(dt, 2)} = {f(d[i], 4)} rad</Text>
        ))}
        <Txt bold>Maior variação: intervalo {iMax + 1} ({f(d[iMax], 4)} rad)</Txt>
        <Txt bold>Acumulado: {f(tot, 4)} rad = {f((tot * 180) / Math.PI, 2)}°</Txt>
        <Txt>Verifique: a maior ω garante a maior variação? Compare ω e Δt de cada intervalo. O sinal negativo indica rotação no sentido oposto.</Txt>
      </Card>
    </>
  );
}

/* ---------- EX 7 ---------- */
function Ex7() {
  const [, ref] = useSensor(Gyroscope, 100);
  const [busy, setBusy] = useState(false);
  const [tol, setTol] = useState('0,01');
  const [res, setRes] = useState(null);
  const run = () => {
    const smp = [];
    setBusy(true);
    const id = setInterval(() => smp.push({ ...ref.current }), 100);
    setTimeout(() => {
      clearInterval(id);
      const dt = 0.1, t = num(tol);
      const out = {};
      ['x', 'y', 'z'].forEach((k) => {
        const m = smp.reduce((a, p) => a + p[k], 0) / smp.length;
        const raw = smp.reduce((a, p) => a + p[k] * dt, 0);
        const cal = smp.reduce((a, p) => a + (p[k] - m) * dt, 0);
        const dz = smp.reduce((a, p) => a + (Math.abs(p[k]) < t ? 0 : p[k]) * dt, 0);
        const deg = (r) => (r * 180) / Math.PI;
        out[k] = { m, raw: deg(raw), cal: deg(cal), dz: deg(dz), min: Math.min(...smp.map((p) => p[k])), max: Math.max(...smp.map((p) => p[k])) };
      });
      setRes({ out, n: smp.length, first: smp.slice(0, 10) });
      setBusy(false);
    }, 20000);
  };
  return (
    <>
      <Card title="Antes: hipótese">
        <Txt>Deixe o celular parado numa superfície. Você espera zero exato? O que acontece ao acumular valores minúsculos por minutos?</Txt>
      </Card>
      <Card title="Gravação de 20 s (celular parado!)">
        <Field label="Zona de tolerância (rad/s)" value={tol} onChangeText={setTol} width={120} />
        <Btn label={busy ? 'Gravando… não toque no aparelho' : 'Iniciar'} onPress={() => !busy && run()} />
      </Card>
      {res && (
        <Card title={`Resultados (${res.n} amostras, Δt = 0,1 s)`}>
          <Txt bold>Dez primeiras leituras (rad/s)</Txt>
          {res.first.map((p, i) => <Text key={i} style={s.mono}>{i + 1}: X={f(p.x, 4)} Y={f(p.y, 4)} Z={f(p.z, 4)}</Text>)}
          {['x', 'y', 'z'].map((k) => (
            <View key={k} style={{ marginTop: 6 }}>
              <Text style={s.mono}>Eixo {k.toUpperCase()}: média = {f(res.out[k].m, 5)} rad/s</Text>
              <Text style={s.mono}>  ângulo sem correção = {f(res.out[k].raw, 3)}°</Text>
              <Text style={s.mono}>  com calibração (−média) = {f(res.out[k].cal, 3)}°</Text>
              <Text style={s.mono}>  com zona de tolerância = {f(res.out[k].dz, 3)}°</Text>
            </View>
          ))}
          <Txt>Extrapole: ângulo sem correção × (minutos × 60 / 20) mostra o drift acumulado. Cite uma desvantagem da estratégia escolhida.</Txt>
        </Card>
      )}
    </>
  );
}

/* ---------- EX 8 ---------- */
function Ex8() {
  const [m] = useSensor(Magnetometer, 200);
  const [ref0, setRef0] = useState(null);
  const [log, setLog] = useState([]);
  const mag = Math.sqrt(m.x ** 2 + m.y ** 2 + m.z ** 2);
  const head = ((Math.atan2(m.y, m.x) * 180) / Math.PI + 360) % 360;
  const add = (label) => setLog([...log, `${label}: |B| = ${f(mag, 1)} µT, direção = ${f(head, 0)}°`]);
  return (
    <>
      <Card title="Magnetômetro (µT)">
        <Xyz d={m} unit="µT" />
        <Text style={s.mono}>|B| = {f(mag, 1)} µT  (Terra ≈ 25–65 µT)</Text>
        <Text style={s.mono}>Direção (atan2 simples, sem compensar inclinação) = {f(head, 0)}°</Text>
        {ref0 != null && <Text style={s.mono}>Variação em relação à referência: {f(mag - ref0, 1)} µT</Text>}
        <Btn label="Definir referência (longe de tudo)" onPress={() => setRef0(mag)} />
      </Card>
      <Card title="Procedimento de teste">
        <Txt>1) Celular plano, longe de metais/ímãs → registre. 2) Aproxime de uma caixa de som → registre (muda |B|? = interferência). 3) Afaste e incline ~45° → registre (|B| igual mas direção mudou? = inclinação). 4) Gire 90° em local limpo: a direção deve mudar ~90° (se não, suspeite da lógica).</Txt>
        <Btn label="Registrar situação atual" onPress={() => add(`Teste ${log.length + 1}`)} />
        {log.map((l, i) => <Text key={i} style={s.mono}>{l}</Text>)}
      </Card>
    </>
  );
}

/* ---------- EX 9 ---------- */
const W = 300, B = 30;
function Ex9() {
  const [a] = useSensor(Accelerometer, 50);
  const [mode, setMode] = useState('melhorado');
  const [inv, setInv] = useState(true);
  const [pos, setPos] = useState((W - B) / 2);
  const last = useRef(Date.now());
  useEffect(() => {
    const now = Date.now();
    const dt = Math.min((now - last.current) / 1000, 0.1);
    last.current = now;
    const v = (inv ? -1 : 1) * a.x;
    setPos((p) => {
      if (mode === 'ingênuo') return p + (v > 0.5 ? 10 : -10);
      const dz = 0.08;
      if (Math.abs(v) < dz) return p;
      const sp = (Math.abs(v) - dz) * Math.sign(v) * 400; // px/s proporcional à inclinação
      return Math.max(0, Math.min(W - B, p + sp * dt));
    });
  }, [a]);
  return (
    <>
      <Card title={`Modo: ${mode}`}>
        <View style={s.arena}>
          <View style={[s.ball, { left: Math.max(0, Math.min(W - B, pos)) }]} />
        </View>
        <Text style={s.mono}>X = {f(a.x)}  posição = {f(pos, 0)}</Text>
        <Btn label="Alternar ingênuo / melhorado" onPress={() => setMode(mode === 'ingênuo' ? 'melhorado' : 'ingênuo')} />
        <Btn label={`Inverter sentido (${inv ? 'sim' : 'não'})`} color="#888" onPress={() => setInv(!inv)} />
      </Card>
      <Card title="Lógica">
        <Text style={s.mono}>{mode === 'ingênuo'
          ? 'se X > 0,5: pos += 10\nsenão: pos -= 10\n(sem zona central, sem limites,\n sem Δt, sem proporcionalidade)'
          : 'se |X| < 0,08: parar (zona central)\nvel = (|X| − 0,08) × sinal × 400\npos += vel × Δt  (independe da taxa)\npos = limitar(pos, 0, largura − bola)'}</Text>
        <Txt>Anote quais problemas aparecem no modo ingênuo (tremor, saída da tela, velocidade fixa, etc.).</Txt>
      </Card>
    </>
  );
}

/* ---------- EX 10 ---------- */
const FIELDS = ['Condição física', 'Valores observados', 'Resposta esperada', 'Resposta produzida', 'Diferenças encontradas', 'Possível explicação', 'Alteração realizada no programa'];
function Ex10() {
  const [plan, setPlan] = useState('');
  const [cur, setCur] = useState({});
  const [tests, setTests] = useState([]);
  return (
    <>
      <Card title="Parte 1 — Planejamento">
        <Txt>Fenômeno, sensores, grandezas, unidades, eixos, cálculos, valores de referência, interface esperada, fontes de erro e hipótese.</Txt>
        <Field label="Planejamento" value={plan} onChangeText={setPlan} multiline />
      </Card>
      <Card title={`Parte 2 — Registro de teste (${tests.length} salvos)`}>
        {FIELDS.map((k) => (
          <Field key={k} label={k} value={cur[k] || ''} onChangeText={(t) => setCur({ ...cur, [k]: t })} />
        ))}
        <Btn label="Salvar teste" onPress={() => { setTests([...tests, cur]); setCur({}); }} />
      </Card>
      {tests.map((t, i) => (
        <Card key={i} title={`Teste ${i + 1}`}>
          {FIELDS.map((k) => <Text key={k} style={s.mono}>{k}: {t[k] || '—'}</Text>)}
        </Card>
      ))}
      <Card title="Parte 3 — Defesa">
        <Txt>Fenômeno físico → Medição → Dados numéricos → Cálculo/tratamento → Decisão lógica → Resposta do app.</Txt>
      </Card>
    </>
  );
}

/* ---------- navegação ---------- */
const SCREENS = [
  ['1 · Eixos do acelerômetro', Ex1], ['2 · Movimento ou inclinação?', Ex2], ['3 · Aceleração e unidade g', Ex3],
  ['4 · Regra de decisão', Ex4], ['5 · Oscilação e histerese', Ex5], ['6 · Giroscópio → ângulo', Ex6],
  ['7 · Drift do giroscópio', Ex7], ['8 · Bússola instável', Ex8], ['9 · Bolinha (auditoria)', Ex9], ['10 · Projeto investigativo', Ex10],
];




export default function App() {
  const [i, setI] = useState(null);
  const Screen = i != null ? SCREENS[i][1] : null;
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        {i != null && <TouchableOpacity onPress={() => setI(null)}><Text style={s.back}>‹ Voltar</Text></TouchableOpacity>}
        <Text style={s.title}>{i != null ? SCREENS[i][0] : 'Laboratório de Sensores'}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {Screen ? <Screen /> : SCREENS.map(([name], k) => (
          <TouchableOpacity key={k} style={s.menu} onPress={() => setI(k)}><Text style={s.menuTxt}>{name}</Text></TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2f4f8', paddingTop: 30 },
  header: { padding: 14, backgroundColor: '#1f3a8a' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  back: { color: '#bcd', marginBottom: 4 },
  menu: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 8, elevation: 1 },
  menuTxt: { fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10 },
  cardTitle: { fontWeight: '700', fontSize: 15, marginBottom: 6, color: '#1f3a8a' },
  txt: { fontSize: 14, marginVertical: 3, color: '#222' },
  mono: { fontFamily: 'monospace', fontSize: 12.5, marginVertical: 1, color: '#111' },
  label: { fontSize: 12, color: '#555', marginBottom: 2 },
  input: { borderWidth: 1, borderColor: '#ccd', borderRadius: 6, padding: 8, backgroundColor: '#fafbff', textAlignVertical: 'top' },
  btn: { backgroundColor: '#2563eb', padding: 11, borderRadius: 8, marginTop: 8, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '600' },
  arena: { width: W, height: 50, backgroundColor: '#e5e9f2', borderRadius: 8, alignSelf: 'center', justifyContent: 'center', marginBottom: 8 },
  ball: { position: 'absolute', width: B, height: B, borderRadius: B / 2, backgroundColor: '#ef4444' },
});