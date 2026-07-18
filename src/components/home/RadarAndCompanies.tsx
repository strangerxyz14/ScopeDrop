import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRadar } from "@/hooks/home/useRadar";
import { useTrendingCompanies } from "@/hooks/home/useTrendingCompanies";
import { useReveal } from "@/hooks/home/useReveal";
import { formatMoneyShort } from "./utils";

function RadarPanel() {
  const { data = [], isLoading } = useRadar(5);
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section id="radar" ref={ref}>
      <div className="sec-h">
        <h3>Emerging tech radar · this quarter</h3>
        <Link className="more" to="/tech/emerging">
          Full radar →
        </Link>
      </div>
      {data.length === 0 && !isLoading ? (
        <div className="sd-empty">
          <span className="k">Radar populates once tracked rounds reach density</span>
          <p>No sectors have enough capital events tracked yet.</p>
        </div>
      ) : (
        <>
          {(data.length > 0 ? data : [{ name: "—", velocityPct: 0 }, { name: "—", velocityPct: 0 }, { name: "—", velocityPct: 0 }]).map((s, i) => (
            <div key={`${s.name}-${i}`} className="radar-item">
              <span className="nm">{s.name}</span>
              <span className="bh">
                <i style={{ ["--w" as string]: `${Math.min(100, Math.max(0, s.velocityPct))}%` } as React.CSSProperties}></i>
              </span>
              <span className="v">+{s.velocityPct}%</span>
            </div>
          ))}
          <div className="radar-note">
            FUNDING MOMENTUM, QUARTER OVER QUARTER · COMPUTED FROM TRACKED ROUNDS
          </div>
        </>
      )}
    </section>
  );
}

function CompaniesPanel() {
  const { data = [], isLoading } = useTrendingCompanies(4);
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  const label = "Companies · look up any";

  return (
    <section ref={ref}>
      <div className="sec-h">
        <h3>{label}</h3>
        <Link className="more" to="/directory">
          Directory →
        </Link>
      </div>
      <button
        type="button"
        className="co-search"
        onClick={() => navigate("/search")}
        aria-label="Search companies"
      >
        <span aria-hidden="true">⌕</span>&nbsp;Search companies by name, sector, or investor…
        <span className="k">⌘K</span>
      </button>
      {isLoading ? (
        <div className="co-list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="co-row">
              <div>
                <div className="sd-skel" style={{ height: 20, width: 140 }}></div>
                <div className="sd-skel" style={{ height: 12, width: 200, marginTop: 6 }}></div>
              </div>
            </div>
          ))}
        </div>
      ) : data.length === 0 ? null : (
        <div className="co-list">
          {data.map((c) => {
            const amt = formatMoneyShort(c.total_funding_raised);
            const secBits = [c.sector, c.headquarters].filter(Boolean).join(" · ").toUpperCase();
            return (
              <Link key={c.id} className="co-row" to={`/directory?entity=${c.id}`}>
                <div>
                  <div className="nm">{c.name}</div>
                  {secBits && <div className="sec">{secBits}</div>}
                </div>
                {amt && <div className="v">{amt}</div>}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function RadarAndCompanies() {
  return (
    <section className="duo-sec">
      <div className="wrap">
        <div className="duo">
          <RadarPanel />
          <CompaniesPanel />
        </div>
      </div>
    </section>
  );
}
