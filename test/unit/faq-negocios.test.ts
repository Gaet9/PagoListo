import { describe, it, expect } from "vitest";

import {
    buildFaqPageJsonLd,
    faqItemsFullPage,
    faqItemsHome,
} from "@/lib/content/faq-negocios";

describe("faq-negocios", () => {
    it("tiene entre 10 y 15 preguntas en la home y al menos 20 en la página /faq", () => {
        expect(faqItemsHome.length).toBeGreaterThanOrEqual(10);
        expect(faqItemsHome.length).toBeLessThanOrEqual(15);
        expect(faqItemsFullPage.length).toBeGreaterThanOrEqual(20);
    });

    it("buildFaqPageJsonLd genera FAQPage con mainEntity", () => {
        const json = buildFaqPageJsonLd(faqItemsHome.slice(0, 2));
        expect(json["@type"]).toBe("FAQPage");
        expect(Array.isArray(json.mainEntity)).toBe(true);
        const first = (json.mainEntity as { name: string; acceptedAnswer: { text: string } }[])[0];
        expect(first?.name).toBe(faqItemsHome[0]?.question);
        expect(first?.acceptedAnswer?.text).toBe(faqItemsHome[0]?.answer);
    });
});
