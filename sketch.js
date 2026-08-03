function setup() {
  noCanvas();
  drawChart();
  window.addEventListener("resize", drawChart);
}

// 🎨 Palette ZIVI — familles de teintes cohérentes plutôt que des couleurs
// disparates : Kulturgütererhaltung reprend un petrol plus foncé (accent1),
// Entwicklungszusammenarbeit un lila plus clair (accent3). Le reste vient
// directement de la charte (accent1-6).
const COLORS = {
  "Sozialwesen / Social / Servizi sociali": "#5A959D",                // accent1 — petrol
  "Schulwesen / Instruction publique / Scuola": "#A3A8CA",            // accent3 — lila
  "Gesundheitswesen / Santé / Sanità": "#CAE7EA",                     // accent2
  "Umwelt- und Naturschutz / Protection de l’environnement et de la nature / Protezione dell’ambiente e della natura": "#B1B488", // accent4
  "Kulturgütererhaltung / Conservation des biens culturels / Conservazione dei beni culturali": "#E7E6E6", // lt2 — gris clair (couleur officielle de la charte)
  "Landwirtschaft / Agriculture / Agricoltura": "#FF0000",            // accent6
  "Entwicklungszusammenarbeit / Coopération au développement / Cooperazione per lo sviluppo": "#C6C9DE", // lila clair (variante d'accent3)
  "Katastrophen und Notlagen / Catastrophes et situations d’urgence / Catastrofi e di situazioni d’emergenza": "#FCEB30" // accent5
};

// --- Formatage suisse : 952'491 ---
function formatSwiss(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

// --- Typographie numérique suisse : point décimal, pas de virgule (50.4 %) ---
function formatPercent(p) {
  return p.toFixed(1) + " %";
}

function drawChart() {

  d3.select("#chart").selectAll("*").remove();

  const containerWidth = document.getElementById("chart").clientWidth;
  const width = containerWidth;
  const isMobile = width < 600;
  const height = 420;

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  d3.csv("BEZ_DT_Taetigkeitsbereich_2025.csv").then(data => {

    data.forEach(d => {
      d.Value = +d.Value;
      d.Percent = +d.Percent;
    });

    data.sort((a, b) => b.Value - a.Value);

    const margin = {
      top: 3,   // ⭐ écart final entre le titre HTML et le graphique
      right: isMobile ? 90 : 160,   // ⭐ assez de place pour "952'491 · 50,4 %"
      bottom: 38,
      left: isMobile ? 190 : 450
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.Value) * 1.08])
      .range([0, innerWidth]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.Label))
      .range([0, innerHeight])
      .padding(0.3);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // --- Barres avec animation d'apparition ---
    const bars = g.selectAll("rect.bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("y", d => y(d.Label))
      .attr("height", y.bandwidth())
      .attr("width", 0)
      .attr("fill", d => COLORS[d.Label] || "#999999");

    bars.transition()
      .delay((d, i) => i * 80)
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("width", d => x(d.Value));

    // --- Étiquette "valeur · %" au bout de chaque barre, avec compteur animé ---
    const valueLabels = g.selectAll("text.value")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "value")
      .attr("x", 8)
      .attr("y", d => y(d.Label) + y.bandwidth() / 2)
      .attr("dominant-baseline", "middle")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "10.5px" : "12px")
      .style("font-weight", "bold")
      .style("fill", "#111")
      .text("0");

    valueLabels.transition()
      .delay((d, i) => i * 80)
      .duration(800)
      .ease(d3.easeCubicOut)
      .attr("x", d => x(d.Value) + 8)
      .textTween(function (d) {
        const iVal = d3.interpolateNumber(0, d.Value);
        const iPct = d3.interpolateNumber(0, d.Percent);
        return t => `${formatSwiss(iVal(t))} · ${formatPercent(Math.round(iPct(t) * 10) / 10)}`;
      });

    // --- Labels trilingues à gauche ---
    const rowLabels = g.selectAll("text.label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("x", -10)
      .attr("y", d => y(d.Label))
      .attr("text-anchor", "end")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "10.5px" : "12px");

    rowLabels.each(function (d) {
      const parts = d.Label.split(" / ");
      const group = d3.select(this);

      group.append("tspan").attr("x", -10).attr("dy", "0.9em").text(parts[0]);
      group.append("tspan").attr("x", -10).attr("dy", "1.2em").text(parts[1]);
      group.append("tspan").attr("x", -10).attr("dy", "1.2em").text(parts[2]);
    });

    // --- Axe X ---
    g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(
        d3.axisBottom(x)
          .ticks(isMobile ? 4 : 8)
          .tickFormat(d => formatSwiss(d))
      );

    // --- Titre d'axe trilingue ---
    svg.append("text")
      .attr("x", margin.left + innerWidth / 2)
      .attr("y", height - 8)
      .attr("text-anchor", "middle")
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "10.5px" : "11.5px")
      .style("fill", "#555")
      .text("Diensttage / Jours de service / Giorni di servizio");

    // --- Survol par ligne : met en évidence label + barre + valeur ---
    // (pas de tooltip : tout est déjà lisible en permanence sur le graphique)
    function highlight(label) {
      g.selectAll(".bar, .value, .label")
        .transition().duration(150)
        .style("opacity", d => (label === null || d.Label === label) ? 1 : 0.3);
    }

    g.selectAll("rect.hit")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "hit")
      .attr("x", -margin.left)
      .attr("y", d => y(d.Label) - (y.step() - y.bandwidth()) / 2)
      .attr("width", innerWidth + margin.left + margin.right)
      .attr("height", y.step())
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => highlight(d.Label))
      .on("mouseout", () => highlight(null));
  });
}
