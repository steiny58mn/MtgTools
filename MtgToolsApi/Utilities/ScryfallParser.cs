using System.Text.Json;

namespace MtgToolsApi.Utilities;

public static class ScryfallParser
{
    // public static List<ScryfallData.ParsedCard> CardList(ScryfallData.CardList cardList)
    // {
    //     return cardList.Data.Select(t => new ScryfallData.ParsedCard
    //         {
    //             Name = t.Name,
    //             Set = t.Set,
    //             ManaCost = t.ManaCost,
    //             Rarity = t.Rarity,
    //             PauperLegal = t.Legalities?.Pauper,
    //             UsdPrice = t.Usd,
    //             TypeLine = t.TypeLine,
    //             RulingsUri = t.RulingsUri,
    //             Artist = t.Artist,
    //             CollectorNum = t.CollectorNumber,
    //             SetName = t.SetName,
    //             Language = t.Lang,
    //             MultiverseId = t.MultiverseIds,
    //             IsReserved = t.Reserved,
    //             OracleText = t.OracleText,
    //             //This will include all the printed texts for all the different faces
    //             CardFacesArray = t.CardFacesArray
    //         })
    //         .ToList();
    // }

    // public static List<ScryfallData.Ruling> RulingList(List<ScryfallData.Rules> rulingList)
    // {
    //     return rulingList.Select(rule => new ScryfallData.Ruling
    //     {
    //         OracleId = rule.OracleId, 
    //         PublishedAt = rule.PublishedAt, 
    //         Comment = rule.Comment
    //     }).ToList();
    // }

    // public static List<ScryfallData.ParsedCard> DatumList(List<ScryfallData.Datum> datumList)
    // {
    //     return datumList.Select(datum => new ScryfallData.ParsedCard
    //     {
    //         Name = datum.Name, 
    //         Set = datum.Set, 
    //         UsdPrice = datum.Usd
    //     }).ToList();
    // }
    
    // private class SnakeCaseNamingPolicy : JsonNamingPolicy
    // {
    //     public override string ConvertName(string name) =>
    //         CamelCase.ConvertName(name).Replace("_",""); // Use a custom extension or library for conversion.
    // }

    public static JsonSerializerOptions JsonNamingOptions()
    {
        return new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }
}