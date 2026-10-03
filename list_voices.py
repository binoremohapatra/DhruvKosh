import edge_tts
import asyncio

async def amain():
    voices = await edge_tts.VoicesManager.create()
    us_voices = [v for v in voices.voices if v['Locale'] == 'en-US' and v['Gender'] == 'Female']
    for v in us_voices:
        print(f"{v['ShortName']} - {v.get('FriendlyName', '')}")

if __name__ == '__main__':
    asyncio.run(amain())
