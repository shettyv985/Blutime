import type { CampaignRule } from "../types";

type CampaignRulesManagerProps = {
  campaignRules: CampaignRule[];
  newClientName: string;
  newCampaignType: CampaignRule["campaign_type"];
  newPod: string;
  newAccountManager: string;
  newStaticCount: number;
  newVideoCount: number;
  newCanvaCount: number;
  newAiVideoCount: number;
  newShootVideoCount: number;
  onNewClientNameChange: (value: string) => void;
  onNewCampaignTypeChange: (value: CampaignRule["campaign_type"]) => void;
  onNewPodChange: (value: string) => void;
  onNewAccountManagerChange: (value: string) => void;
  onNewStaticCountChange: (value: number) => void;
  onNewVideoCountChange: (value: number) => void;
  onNewCanvaCountChange: (value: number) => void;
  onNewAiVideoCountChange: (value: number) => void;
  onNewShootVideoCountChange: (value: number) => void;
  onAddRule: () => void;
  onUpdateRule: (rule: CampaignRule, patch: Partial<CampaignRule>) => void;
  onDeactivateRule: (rule: CampaignRule) => void;
};

const pods = ["Reshma", "Relsa", "Robish", "All"] as const;

export function CampaignRulesManager({
  campaignRules,
  newClientName,
  newCampaignType,
  newPod,
  newAccountManager,
  newStaticCount,
  newVideoCount,
  newCanvaCount,
  newAiVideoCount,
  newShootVideoCount,
  onNewClientNameChange,
  onNewCampaignTypeChange,
  onNewPodChange,
  onNewAccountManagerChange,
  onNewStaticCountChange,
  onNewVideoCountChange,
  onNewCanvaCountChange,
  onNewAiVideoCountChange,
  onNewShootVideoCountChange,
  onAddRule,
  onUpdateRule,
  onDeactivateRule,
}: CampaignRulesManagerProps) {
  return (
    <div className="card" style={{ borderRadius: "var(--radius-xl)", padding: "1.375rem 1.5rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 className="section-title">Campaign rules</h3>
        <p className="section-desc">Manage monthly client deliverable rules, including AI vs shoot-based video.</p>
      </div>

      {/* Add form */}
      <div className="inset-surface" style={{ marginBottom: "1.25rem" }}>
        <p
          style={{
            marginBottom: "0.75rem",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Add new rule
        </p>
        <div className="campaign-add-grid" style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: "0.5rem" }}>
          <input className="field" placeholder="Client name" value={newClientName} onChange={(e) => onNewClientNameChange(e.target.value)} />
          <select className="field" value={newCampaignType} onChange={(e) => onNewCampaignTypeChange(e.target.value as CampaignRule["campaign_type"])}>
            <option value="performance">performance</option>
            <option value="social_media">social_media</option>
          </select>
          <select className="field" value={newPod} onChange={(e) => onNewPodChange(e.target.value)}>
            {pods.map((pod) => <option key={pod}>{pod}</option>)}
          </select>
          <input className="field" placeholder="Account manager" value={newAccountManager} onChange={(e) => onNewAccountManagerChange(e.target.value)} />
          <input className="field" type="number" min={0} value={newStaticCount} onChange={(e) => onNewStaticCountChange(Number(e.target.value))} placeholder="Static" />
          <input className="field" type="number" min={0} value={newCanvaCount} onChange={(e) => onNewCanvaCountChange(Number(e.target.value))} placeholder="Canva" />
          <input className="field" type="number" min={0} value={newAiVideoCount} onChange={(e) => onNewAiVideoCountChange(Number(e.target.value))} placeholder="AI video" />
          <input className="field" type="number" min={0} value={newShootVideoCount} onChange={(e) => onNewShootVideoCountChange(Number(e.target.value))} placeholder="Shoot video" />
          <button
            onClick={onAddRule}
            style={{
              padding: "0 1rem",
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
              color: "white",
              fontWeight: 700,
              fontSize: "0.8rem",
              border: "none",
              boxShadow: "0 2px 10px var(--primary-glow-strong)",
              whiteSpace: "nowrap",
            }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scroll-area">
        <table className="data-table" style={{ minWidth: "1350px" }}>
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Pod</th>
              <th>AM</th>
              <th>Static</th>
              <th>Canva</th>
              <th>AI video</th>
              <th>Shoot video</th>
              <th>Total video</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {campaignRules.map((rule) => (
              <tr key={rule.id}>
                <td>
                  <input
                    className="field"
                    style={{ minWidth: "180px", fontSize: "0.8rem" }}
                    defaultValue={rule.client_name}
                    onBlur={(e) => onUpdateRule(rule, { client_name: e.target.value.trim() })}
                  />
                </td>
                <td>
                  <select
                    className="field"
                    style={{ fontSize: "0.8rem" }}
                    defaultValue={rule.campaign_type}
                    onBlur={(e) => onUpdateRule(rule, { campaign_type: e.target.value as CampaignRule["campaign_type"] })}
                  >
                    <option value="performance">performance</option>
                    <option value="social_media">social_media</option>
                  </select>
                </td>
                <td>
                  <select
                    className="field"
                    style={{ fontSize: "0.8rem" }}
                    defaultValue={rule.pod}
                    onBlur={(e) => onUpdateRule(rule, { pod: e.target.value })}
                  >
                    {pods.map((pod) => <option key={pod}>{pod}</option>)}
                  </select>
                </td>
                <td>
                  <input
                    className="field"
                    style={{ minWidth: "130px", fontSize: "0.8rem" }}
                    defaultValue={rule.account_manager}
                    onBlur={(e) => onUpdateRule(rule, { account_manager: e.target.value.trim() })}
                  />
                </td>
                {[
                  { key: "static_count", val: rule.static_count },
                  { key: "canva_count", val: rule.canva_count },
                  { key: "ai_video_count", val: rule.ai_video_count ?? 0 },
                  { key: "shoot_video_count", val: rule.shoot_video_count ?? 0 },
                ].map(({ key, val }) => (
                  <td key={key}>
                    <input
                      className="field"
                      style={{ width: "5rem", fontSize: "0.8rem" }}
                      type="number"
                      min={0}
                      defaultValue={val}
                      onBlur={(e) => onUpdateRule(rule, { [key]: Number(e.target.value) })}
                    />
                  </td>
                ))}
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      height: "1.9rem",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      padding: "0 0.75rem",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      background: "var(--primary-glow)",
                      color: "var(--primary)",
                      border: "1px solid color-mix(in srgb, var(--primary) 20%, transparent)",
                    }}
                  >
                    {(rule.ai_video_count ?? 0) + (rule.shoot_video_count ?? 0)}
                  </span>
                </td>
                <td>
                  <button className="btn-danger" onClick={() => onDeactivateRule(rule)}>Remove</button>
                </td>
              </tr>
            ))}
            {campaignRules.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                  No campaign rules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .campaign-add-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .campaign-add-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}