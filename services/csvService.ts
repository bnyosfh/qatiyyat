import { MasterParticipant } from '../types';

export const fetchMasterParticipants = async (url: string): Promise<MasterParticipant[]> => {
  try {
    // Method 1: Direct Fetch (Might fail due to CORS)
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error("Direct fetch failed");
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.warn("Direct fetch failed, trying proxy...", error);
    
    // Method 2: CORS Proxy (Fallback)
    // Using allorigins.win as a reliable free proxy
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetch(proxyUrl, { cache: 'no-store' });
      if (!proxyResponse.ok) throw new Error("Proxy fetch failed");
      const text = await proxyResponse.text();
      return parseCSV(text);
    } catch (proxyError) {
      console.error("All fetch methods failed:", proxyError);
      throw proxyError;
    }
  }
};

const parseCSV = (csvText: string): MasterParticipant[] => {
  const lines = csvText.trim().split('\n');
  const participants: MasterParticipant[] = [];

  lines.forEach((line, index) => {
    // Handle potential carriage returns and splits
    const cleanLine = line.replace(/\r/g, '').trim();
    if (!cleanLine) return;

    const columns = cleanLine.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
    
    // Skip header (dumb check for "Name" or "الاسم")
    if (index === 0 && (columns[0].includes("الاسم") || columns[0].toLowerCase().includes("name"))) {
      return;
    }
    
    if (columns.length > 0 && columns[0]) {
      participants.push({
        // Generate a deterministic but unique ID for this session
        id: `p_${index}_${Date.now().toString(36)}`,
        name: columns[0],
        type: columns[1] || 'كبير'
      });
    }
  });

  return participants;
};