import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const pipelineUrl = process.env.PIPELINE_URL;
    
    if (!pipelineUrl) {
      console.warn("PIPELINE_URL environment variable is not set. Cannot ping data pipeline.");
      return NextResponse.json({ message: "No pipeline URL configured" }, { status: 200 });
    }

    const response = await fetch(pipelineUrl);
    
    if (response.ok) {
      return NextResponse.json({ message: "Data pipeline pinged successfully" }, { status: 200 });
    } else {
      console.error(`Failed to ping data pipeline. Status: ${response.status}`);
      return NextResponse.json({ error: "Failed to ping data pipeline" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error pinging data pipeline:", error);
    return NextResponse.json({ error: "Error pinging data pipeline" }, { status: 500 });
  }
}
