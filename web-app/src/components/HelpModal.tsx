import React, { useState } from 'react';

export interface WebHelpContent {
  title: string;
  whatItDoes: string;
  howToDoIt: string[];
  whatToExpect: string;
}

export function WebHelpButton({ help }: { help: WebHelpContent }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`Help: ${help.title}`}
        title={`Help: ${help.title}`}
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '1px solid #A8CC96',
          backgroundColor: '#F4F8F1',
          color: '#294A1F',
          fontSize: 12,
          fontWeight: 800,
          cursor: 'pointer',
          marginLeft: 8,
          verticalAlign: 'middle',
        }}
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(26, 38, 22, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #CFE3C4',
              maxWidth: 480,
              width: '100%',
              padding: 20,
              boxShadow: '0 12px 32px rgba(26, 38, 22, 0.2)',
              color: '#1A2616',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, color: '#294A1F' }}>
                {help.title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  border: '1px solid #CFE3C4',
                  background: '#F4F8F1',
                  color: '#294A1F',
                  borderRadius: 8,
                  padding: '4px 10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <p style={{ margin: '0 0 10px' }}>
                <strong>What it does:</strong> {help.whatItDoes}
              </p>
              <p style={{ margin: '0 0 6px' }}>
                <strong>How to do it:</strong>
              </p>
              <ol style={{ margin: '0 0 10px', paddingLeft: 20 }}>
                {help.howToDoIt.map((step, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {step}
                  </li>
                ))}
              </ol>
              <p
                style={{
                  margin: 0,
                  padding: 10,
                  backgroundColor: '#F4F8F1',
                  borderRadius: 8,
                  border: '1px solid #E6F0E0',
                }}
              >
                <strong>What to expect:</strong> {help.whatToExpect}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
