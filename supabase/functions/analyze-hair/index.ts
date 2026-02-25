import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { photoUrls, previousScores } = await req.json();

    if (!photoUrls || !Array.isArray(photoUrls) || photoUrls.length === 0) {
      return new Response(JSON.stringify({ error: "No photos provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageContent = photoUrls.map((url: { url: string; angle: string }) => ({
      type: "image_url" as const,
      image_url: { url: url.url },
    }));

    const comparisonContext = previousScores
      ? `\n\nPrevious analysis scores for comparison: Overall: ${previousScores.overall}/100, Density: ${previousScores.density}/100, Hairline: ${previousScores.hairline}/100, Crown: ${previousScores.crown}/100. Compare these to the current photos and note any changes.`
      : "";

    const systemPrompt = `You are a hair health analysis AI assistant. You analyze photos of a person's scalp to estimate hair health metrics. 

IMPORTANT: You are NOT providing medical diagnosis. All results are informational estimates only.

Analyze the provided photos and evaluate:
1. Hair density (0-100): Overall thickness and coverage
2. Hairline position (0-100): How intact the hairline appears (100 = no recession)
3. Crown health (0-100): Crown area coverage and density
4. Overall health score (0-100): Weighted average considering all factors

Also determine if there are any notable changes worth alerting the user about (set alert_triggered to true only if significant thinning or recession is detected).

Provide a brief, encouraging but honest summary (2-3 sentences). Be supportive and focus on actionable insights.${comparisonContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze these scalp photos taken from different angles: ${photoUrls.map((p: any) => p.angle).join(", ")}. Provide your structured assessment.`,
              },
              ...imageContent,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_hair_analysis",
              description: "Submit the structured hair analysis results",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "integer", minimum: 0, maximum: 100, description: "Overall hair health score" },
                  density_score: { type: "integer", minimum: 0, maximum: 100, description: "Hair density score" },
                  hairline_score: { type: "integer", minimum: 0, maximum: 100, description: "Hairline health score" },
                  crown_score: { type: "integer", minimum: 0, maximum: 100, description: "Crown area health score" },
                  ai_summary: { type: "string", description: "Brief encouraging summary with actionable insights (2-3 sentences)" },
                  alert_triggered: { type: "boolean", description: "Whether significant changes warrant an alert" },
                  comparison_notes: { type: "string", description: "Notes comparing to previous analysis if available, otherwise null" },
                },
                required: ["overall_score", "density_score", "hairline_score", "crown_score", "ai_summary", "alert_triggered"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_hair_analysis" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "AI did not return structured results" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-hair error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
