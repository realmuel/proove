import path from "path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Font,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

/* ---- register Redaction (OTF) once ---- */
const fontDir = path.join(process.cwd(), "src/lib/pdf-fonts");
let registered = false;
function ensureFonts() {
  if (registered) return;
  Font.register({
    family: "Redaction",
    fonts: [
      { src: path.join(fontDir, "Redaction-Regular.otf"), fontWeight: 400 },
      { src: path.join(fontDir, "Redaction-Bold.otf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Redaction20",
    src: path.join(fontDir, "Redaction20-Regular.otf"),
  });
  Font.register({
    family: "Redaction35",
    src: path.join(fontDir, "Redaction35-Regular.otf"),
  });
  // wrap normally at spaces, but break very long unbroken words so they
  // don't run off the page
  Font.registerHyphenationCallback((word) =>
    word.length > 16 ? (word.match(/.{1,14}/g) ?? [word]) : [word]
  );
  registered = true;
}

/* ---- palette mirrors the web (light theme) ---- */
const C = {
  paper: "#f5efe6",
  surface: "#fbf7f0",
  ink: "#322c25",
  muted: "#857a6d",
  border: "#e3d9c8",
  accent: "#b3622f",
};

const s = StyleSheet.create({
  page: {
    backgroundColor: C.paper,
    color: C.ink,
    fontFamily: "Redaction",
    fontSize: 11,
    padding: 44,
    lineHeight: 1.4,
  },
  title: { fontFamily: "Redaction35", fontSize: 28, lineHeight: 1.25 },
  desc: { color: C.muted, marginTop: 6, fontSize: 12 },
  image: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    borderRadius: 10,
    marginTop: 16,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 16 },
  chip: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { color: C.muted, fontSize: 10, lineHeight: 1 },
  h2: {
    fontFamily: "Redaction20",
    fontSize: 16,
    marginBottom: 7,
  },
  section: { marginTop: 22 },
  ingRow: { flexDirection: "row", marginBottom: 4 },
  ingQty: { color: C.muted, width: 70 },
  step: { flexDirection: "row", marginBottom: 8 },
  stepNum: { color: C.accent, width: 18 },
  toolRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tool: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: { fontSize: 10, lineHeight: 1 },
  footer: {
    marginTop: 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    color: C.muted,
    fontSize: 9,
  },
});

function fmt(n: number) {
  return parseFloat(Number(n).toFixed(2)).toString();
}

export type PdfRecipe = {
  title: string;
  description?: string | null;
  servings: number;
  createdBy?: string | null;
  ovenTemp?: number | null;
  prepTime?: number | null;
  cookTime?: number | null;
  chillTime?: number | null;
  coolTime?: number | null;
  proveTime?: number | null;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: { order: number; content: string }[];
  tools: { name: string }[];
  imageAbsPath: string | null;
  createdAt?: number | string;
};

export async function renderRecipePdf(r: PdfRecipe): Promise<Buffer> {
  ensureFonts();

  const times = (
    [
      ["Prep", r.prepTime],
      ["Cook", r.cookTime],
      ["Chill", r.chillTime],
      ["Cool", r.coolTime],
      ["Prove", r.proveTime],
    ] as const
  ).filter(([, v]) => v != null) as [string, number][];

  const steps = r.steps.slice().sort((a, b) => a.order - b.order);
  const sharedOn = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const doc = (
    <Document title={r.title} author={r.createdBy ?? "Recipes"}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>{r.title}</Text>
        {r.description ? <Text style={s.desc}>{r.description}</Text> : null}

        {r.imageAbsPath ? <Image src={r.imageAbsPath} style={s.image} /> : null}

        {(times.length > 0 || r.ovenTemp != null) && (
          <View style={s.chipRow}>
            {times.map(([label, v]) => (
              <View key={label} style={s.chip}>
                <Text style={s.chipText}>
                  {label} {v}m
                </Text>
              </View>
            ))}
            {r.ovenTemp != null && (
              <View style={s.chip}>
                <Text style={s.chipText}>{r.ovenTemp}°C</Text>
              </View>
            )}
            <View style={s.chip}>
              <Text style={s.chipText}>Serves {r.servings}</Text>
            </View>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.h2}>Ingredients</Text>
          {r.ingredients.map((ing, i) => (
            <View key={i} style={s.ingRow}>
              <Text style={s.ingQty}>
                {fmt(ing.amount)} {ing.unit}
              </Text>
              <Text>{ing.name}</Text>
            </View>
          ))}
        </View>

        {r.tools.length > 0 && (
          <View style={s.section}>
            <Text style={s.h2}>Tools</Text>
            <View style={s.toolRow}>
              {r.tools.map((t, i) => (
                <View key={i} style={s.tool}>
                  <Text style={s.toolText}>{t.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.h2}>Method</Text>
          {steps.map((step, i) => (
            <View key={i} style={s.step}>
              <Text style={s.stepNum}>{i + 1}</Text>
              <Text style={{ flex: 1 }}>{step.content}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>
          {r.createdBy ? `By ${r.createdBy} · ` : ""}
          Shared {sharedOn}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
