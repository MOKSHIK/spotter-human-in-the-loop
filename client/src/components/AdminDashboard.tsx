import type { RefObject } from "react";
import type { AdminImage, Label } from "../types";

type Props = {
  adminStateFilter: "Annotated" | "Verified" | "Rejected";
  onChangeFilter: (v: "Annotated" | "Verified" | "Rejected") => void;

  adminImages: AdminImage[];
  selectedAdminImage: AdminImage | null;
  adminLabels: Label[];

  onLoadAdminImages: () => void | Promise<void>;
  onSelectAdminImage: (img: AdminImage) => void | Promise<void>;
  onDeleteLabel: (labelId: number) => void | Promise<void>;
  onSetImageState: (state: "Verified" | "Rejected") => void | Promise<void>;

  adminImgRef: RefObject<HTMLImageElement |  null >;
  adminCanvasRef: RefObject<HTMLCanvasElement | null>;
  onAdminImageLoad: () => void;
};

export function AdminDashboard({
  adminStateFilter,
  onChangeFilter,
  adminImages,
  selectedAdminImage,
  adminLabels,
  onLoadAdminImages,
  onSelectAdminImage,
  onDeleteLabel,
  onSetImageState,
  adminImgRef,
  adminCanvasRef,
  onAdminImageLoad,
}: Props) {
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ marginTop: 0 }}>Admin Dashboard</h3>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={adminStateFilter} onChange={(e) => onChangeFilter(e.target.value as any)}>
          <option value="Annotated">Annotated</option>
          <option value="Verified">Verified</option>
          <option value="Rejected">Rejected</option>
        </select>
        <button onClick={onLoadAdminImages}>Load</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, marginTop: 16 }}>
        <div>
          <b>Images</b>
          <div style={{ border: "1px solid #ccc", padding: 8, maxHeight: 400, overflow: "auto" }}>
            {adminImages.map((img) => (
              <div
                key={img.id}
                style={{
                  padding: 8,
                  cursor: "pointer",
                  borderRadius: 6,
                  background: selectedAdminImage?.id === img.id ? "#eef2ff" : "transparent",
                }}
                onClick={() => onSelectAdminImage(img)}
              >
                <div style={{ fontWeight: 600 }}>
                  #{img.id} — {img.filename}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{img.state}</div>
              </div>
            ))}
            {adminImages.length === 0 && <div style={{ opacity: 0.7, padding: 8 }}>No images loaded</div>}
          </div>
        </div>

        <div>
          <b>Preview</b>
          {!selectedAdminImage ? (
            <div style={{ opacity: 0.7, marginTop: 8 }}>Select an image to review labels</div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <b>{selectedAdminImage.filename}</b> — labels: {adminLabels.length}
              </div>

              <div style={{ position: "relative", display: "inline-block", border: "1px solid #ccc" }}>
                <img
                  ref={adminImgRef}
                  src={selectedAdminImage.url}
                  alt="admin"
                  style={{ maxWidth: "800px", width: "100%", height: "auto", display: "block" }}
                  onLoad={onAdminImageLoad}
                />
                <canvas ref={adminCanvasRef} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }} />
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => onSetImageState("Verified")}>Mark Verified</button>
                <button onClick={() => onSetImageState("Rejected")} style={{ background: "#dc2626" }}>
                  Mark Rejected
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <b>Labels</b>
                <div style={{ border: "1px solid #ccc", padding: 8 }}>
                  {adminLabels.map((l) => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: 6 }}>
                      <span style={{ fontSize: 13 }}>
                        #{l.id} [{l.xmin},{l.ymin}] → [{l.xmax},{l.ymax}]
                      </span>
                      <button onClick={() => onDeleteLabel(l.id)} style={{ background: "#6b7280" }}>
                        Delete
                      </button>
                    </div>
                  ))}
                  {adminLabels.length === 0 && <div style={{ opacity: 0.7 }}>No labels</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}