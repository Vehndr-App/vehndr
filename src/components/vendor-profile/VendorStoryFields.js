"use client";

import { EVENT_TYPES } from "../../constants/categories";
import { prepareImageForUpload } from "../../utils/imageResize";

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "Mandarin",
  "Cantonese",
  "Vietnamese",
  "Korean",
  "Japanese",
  "Arabic",
  "Hindi",
  "ASL",
];

function newTeamId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function VendorStoryFields({ formData, setFormData }) {
  const years = formData.yearsInBusiness ?? "";
  const bestFor = formData.bestFor || [];
  const languages = formData.languagesSpoken || [];
  const trustedByText =
    formData.trustedByText != null
      ? formData.trustedByText
      : (formData.trustedBy || []).join("\n");
  const pastEvents = formData.pastEvents || [];
  const faqs = formData.faqs || [];
  const teamMembers = formData.teamMembers || [];

  const toggleBestFor = (label) => {
    setFormData((prev) => {
      const current = prev.bestFor || [];
      const next = current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label].slice(0, 12);
      return { ...prev, bestFor: next };
    });
  };

  const toggleLanguage = (label) => {
    setFormData((prev) => {
      const current = prev.languagesSpoken || [];
      const next = current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label].slice(0, 12);
      return { ...prev, languagesSpoken: next };
    });
  };

  return (
    <div className="card bg-white p-5 space-y-8">
      <div>
        <h3 className="text-h4 mb-1">Storefront extras</h3>
        <p className="text-sm text-[var(--gray-500)]">
          Optional details that help planners trust and choose you. Leave blank if you are not ready yet.
        </p>
      </div>

      {/* Years in business */}
      <div>
        <label className="block text-sm font-medium text-[var(--gray-700)] mb-2">
          Years in business
        </label>
        <input
          type="number"
          min="0"
          max="200"
          inputMode="numeric"
          value={years}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              yearsInBusiness: e.target.value === "" ? "" : e.target.value,
            }))
          }
          className="input max-w-[160px]"
          placeholder="e.g. 5"
        />
      </div>

      {/* Best for */}
      <div>
        <div className="mb-2">
          <p className="text-sm font-medium text-[var(--gray-700)]">Best for</p>
          <p className="text-xs text-[var(--gray-500)]">Pick the event types you shine at.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((eventType) => {
            const active = bestFor.includes(eventType.label);
            return (
              <button
                key={eventType.slug}
                type="button"
                onClick={() => toggleBestFor(eventType.label)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-[var(--violet-600)] text-white border-[var(--violet-600)]"
                    : "bg-white text-[var(--gray-700)] border-[var(--gray-200)] hover:border-[var(--violet-300)]"
                }`}
              >
                {eventType.icon} {eventType.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Languages */}
      <div>
        <div className="mb-2">
          <p className="text-sm font-medium text-[var(--gray-700)]">Languages spoken</p>
          <p className="text-xs text-[var(--gray-500)]">Help planners know how to communicate with you.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((language) => {
            const active = languages.includes(language);
            return (
              <button
                key={language}
                type="button"
                onClick={() => toggleLanguage(language)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? "bg-[var(--mint-600)] text-white border-[var(--mint-600)]"
                    : "bg-white text-[var(--gray-700)] border-[var(--gray-200)] hover:border-[var(--mint-300)]"
                }`}
              >
                {language}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trusted by */}
      <div>
        <div className="mb-2">
          <p className="text-sm font-medium text-[var(--gray-700)]">Trusted by</p>
          <p className="text-xs text-[var(--gray-500)]">
            Companies, brands, or venues you have worked with (one per line).
          </p>
        </div>
        <textarea
          rows={3}
          className="input h-auto py-3"
          value={trustedByText}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              trustedByText: e.target.value,
            }))
          }
          onBlur={() =>
            setFormData((prev) => {
              const text = prev.trustedByText != null
                ? prev.trustedByText
                : (prev.trustedBy || []).join("\n");
              const lines = text
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
              return {
                ...prev,
                trustedByText: lines.join("\n"),
                trustedBy: lines,
              };
            })
          }
          placeholder={"Hotel Van Zandt\nAustin City Limits\nYetí Coolers"}
        />
      </div>

      {/* Past events */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-[var(--gray-700)]">Events worked</p>
            <p className="text-xs text-[var(--gray-500)]">
              Specific events you have done — helps planners see your experience.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                pastEvents: [
                  ...(prev.pastEvents || []),
                  { name: "", year: "", location: "" },
                ].slice(0, 40),
              }))
            }
            className="text-sm font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
          >
            + Add event
          </button>
        </div>
        <div className="space-y-3">
          {pastEvents.length === 0 && (
            <p className="text-sm text-[var(--gray-400)]">No events listed yet.</p>
          )}
          {pastEvents.map((event, index) => (
            <div
              key={index}
              className="p-4 rounded-[var(--radius-lg)] border border-[var(--gray-200)] space-y-2"
            >
              <input
                type="text"
                className="input"
                placeholder="Event name (e.g. ACL Festival)"
                value={event.name || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pastEvents: (prev.pastEvents || []).map((item, i) =>
                      i === index ? { ...item, name: e.target.value } : item
                    ),
                  }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  className="input"
                  placeholder="Year (optional)"
                  value={event.year || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pastEvents: (prev.pastEvents || []).map((item, i) =>
                        i === index ? { ...item, year: e.target.value } : item
                      ),
                    }))
                  }
                />
                <input
                  type="text"
                  className="input"
                  placeholder="City / venue (optional)"
                  value={event.location || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pastEvents: (prev.pastEvents || []).map((item, i) =>
                        i === index ? { ...item, location: e.target.value } : item
                      ),
                    }))
                  }
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    pastEvents: (prev.pastEvents || []).filter((_, i) => i !== index),
                  }))
                }
                className="text-xs font-medium text-[var(--error)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-[var(--gray-700)]">Team</p>
            <p className="text-xs text-[var(--gray-500)]">Add faces behind the business.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                teamMembers: [
                  ...(prev.teamMembers || []),
                  { id: newTeamId(), name: "", title: "", photoUrl: "", photoSignedId: "", photoFile: null },
                ].slice(0, 12),
              }))
            }
            className="text-sm font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
          >
            + Add member
          </button>
        </div>

        <div className="space-y-4">
          {teamMembers.length === 0 && (
            <p className="text-sm text-[var(--gray-400)]">No team members yet.</p>
          )}
          {teamMembers.map((member, index) => (
            <div
              key={member.id || index}
              className="p-4 rounded-[var(--radius-lg)] border border-[var(--gray-200)] bg-[var(--gray-50)] space-y-3"
            >
              <div className="flex items-start gap-3">
                <label className="relative w-16 h-16 rounded-full overflow-hidden bg-[var(--gray-200)] flex-shrink-0 cursor-pointer">
                  {(member.photoFilePreview || member.photoUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.photoFilePreview || member.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[var(--gray-400)] text-xs">
                      Photo
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const prepared = await prepareImageForUpload(file, {
                          maxWidth: 1200,
                          maxHeight: 1200,
                          quality: 0.85,
                        });
                        const preview = URL.createObjectURL(prepared);
                        setFormData((prev) => ({
                          ...prev,
                          teamMembers: (prev.teamMembers || []).map((item, i) =>
                            i === index
                              ? { ...item, photoFile: prepared, photoFilePreview: preview }
                              : item
                          ),
                        }));
                      } catch (err) {
                        console.warn("Team photo prepare failed:", err);
                        const preview = URL.createObjectURL(file);
                        setFormData((prev) => ({
                          ...prev,
                          teamMembers: (prev.teamMembers || []).map((item, i) =>
                            i === index
                              ? { ...item, photoFile: file, photoFilePreview: preview }
                              : item
                          ),
                        }));
                      }
                    }}
                  />
                </label>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    className="input"
                    placeholder="Name"
                    value={member.name || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        teamMembers: (prev.teamMembers || []).map((item, i) =>
                          i === index ? { ...item, name: e.target.value } : item
                        ),
                      }))
                    }
                  />
                  <input
                    type="text"
                    className="input"
                    placeholder="Title (e.g. Owner, Lead DJ)"
                    value={member.title || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        teamMembers: (prev.teamMembers || []).map((item, i) =>
                          i === index ? { ...item, title: e.target.value } : item
                        ),
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      teamMembers: (prev.teamMembers || []).filter((_, i) => i !== index),
                    }))
                  }
                  className="text-xs font-medium text-[var(--error)] px-2 py-1"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-medium text-[var(--gray-700)]">FAQs</p>
            <p className="text-xs text-[var(--gray-500)]">Answer common planner questions.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                faqs: [...(prev.faqs || []), { question: "", answer: "" }].slice(0, 20),
              }))
            }
            className="text-sm font-semibold text-[var(--violet-600)] hover:text-[var(--violet-700)]"
          >
            + Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {faqs.length === 0 && (
            <p className="text-sm text-[var(--gray-400)]">No FAQs yet.</p>
          )}
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="p-4 rounded-[var(--radius-lg)] border border-[var(--gray-200)] space-y-2"
            >
              <input
                type="text"
                className="input"
                placeholder="Question"
                value={faq.question || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    faqs: (prev.faqs || []).map((item, i) =>
                      i === index ? { ...item, question: e.target.value } : item
                    ),
                  }))
                }
              />
              <textarea
                rows={2}
                className="input h-auto py-3"
                placeholder="Answer"
                value={faq.answer || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    faqs: (prev.faqs || []).map((item, i) =>
                      i === index ? { ...item, answer: e.target.value } : item
                    ),
                  }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    faqs: (prev.faqs || []).filter((_, i) => i !== index),
                  }))
                }
                className="text-xs font-medium text-[var(--error)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
