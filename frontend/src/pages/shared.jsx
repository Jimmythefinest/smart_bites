import { useState } from "react";
import { api } from "../api";

const statusLabel = {
  placed: "Placed",
  preparing: "Preparation",
  completed: "Prepared",
};

export const ORDER_POLL_MS = 500;

export function formatCurrency(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

export function formatOrderStatus(status) {
  return statusLabel[status] || status;
}

export function Icon({ name }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

export function Panel({ title, children, footer, className = "" }) {
  return (
    <section className={`panel reveal ${className}`}>
      <h2>{title}</h2>
      <div className="panel-body">{children}</div>
      {footer ? <div className="panel-footer">{footer}</div> : null}
    </section>
  );
}

export function Field({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

export function ImageUploadField({ label, onUploaded, onError, onSuccess }) {
  const [pending, setPending] = useState(false);
  const [selectedName, setSelectedName] = useState("");

  async function handleChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setSelectedName(file.name);
      setPending(true);
      const response = await api.uploadImage(file);
      onUploaded(response.url);
      onError("");
      onSuccess?.("Image uploaded");
    } catch (err) {
      onError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <label className="upload-field">
      <span>{label}</span>
      <input type="file" accept="image/*" onChange={handleChange} disabled={pending} />
      <small>
        {pending
          ? `Uploading ${selectedName || "image"}...`
          : selectedName
            ? `Selected: ${selectedName}`
            : "Choose an image file to upload"}
      </small>
    </label>
  );
}

export function StatCard({ label, value, icon = "monitoring", tone = "" }) {
  return (
    <article className={`stat-card reveal ${tone}`}>
      <span className="stat-icon"><Icon name={icon} /></span>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

export function EmptyState({ message }) {
  return <p className="muted empty-state">{message}</p>;
}

export function ItemImage({ item, className, alt }) {
  const src = item?.background_image_url || item?.profile_image_url;
  if (!src) {
    return <div className={`${className} image-placeholder`} aria-hidden="true"><Icon name="restaurant" /></div>;
  }
  return <img className={className} src={src} alt={alt || item.name} />;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action ? <div className="page-actions">{action}</div> : null}
    </div>
  );
}
