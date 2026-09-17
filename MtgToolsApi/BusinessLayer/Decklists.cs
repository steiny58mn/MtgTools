using System.Text;
using System.Xml;
using MtgToolsApi.DataLayer;
using MtgToolsApi.DataRepository;
using MtgToolsApi.Utilities;

namespace MtgToolsApi.BusinessLayer;

public static class Decklists
{
    public static async Task<string> CreateDecklist(IFormFile file)
    {
        await TursoCardDb.UpdateBulkData(); //Check for updates before getting cards
        var allCards = await GetCardList(file);
        return WriteToDecklist(allCards);
    }
    public static async Task<string> CompareDecklists(IFormFile firstFile, IFormFile secondFile)
    {
        await TursoCardDb.UpdateBulkData(); //Check for updates before getting cards

        var deckDifferences = new StringBuilder();
        
        var firstDeckList = GetCardList(firstFile).Result;
        var secondDeckList = GetCardList(secondFile).Result;
        
        deckDifferences.AppendLine("CUTS");
        var cutCards = GetListDifferences(firstDeckList, secondDeckList, ref deckDifferences);
        
        deckDifferences.AppendLine("ADDS");
        var addedCards = GetListDifferences(secondDeckList, firstDeckList, ref deckDifferences);
        
        _ = Logging.ApiLogger.LogMessage($"{cutCards} cards cut and {addedCards} added");
        
        return deckDifferences.ToString();
    }
    public static async Task<string>  CreateDeckPicklist(IFormFile file)
    {
        await TursoCardDb.UpdateBulkData(); //Check for updates before getting cards
        var allCards = await GetCardList(file);
        return WriteToPicklist(allCards);
    }
    private static void LogDecklist(List<CardRecord> deckList)
    {
        try
        {
            var sb = new StringBuilder();
            _ = Logging.ApiLogger.LogMessage($"Logging contents of decklis. Count = {deckList.Count()}");
            foreach (var cardRecord in deckList)
            {
                sb.AppendLine($"Card {cardRecord.Name.Replace("'","''")} - Qty : {cardRecord.Qty}");
            }
        
            _ = Logging.ApiLogger.LogMessage($"Full Contents of decklist: {sb}");
        }
        catch (Exception e)
        {
            _ = Logging.ApiLogger.LogMessage($"Error with logging decklist {e}");
            throw;
        }
    }
    private static int GetListDifferences(List<CardRecord> secondDeckList, List<CardRecord> firstDeckList, ref StringBuilder deckDifferences)
    {
        var cardDifferenceCount = 0;
        foreach (var card in secondDeckList.OrderBy(x=>x.Name))
        {
            var result = firstDeckList.FirstOrDefault(x => x.Name == card.Name);
            var quantity = card.Qty;
            
            if (result != null)
            {
                if (result.Qty < quantity)
                {
                    quantity = quantity - result.Qty;
                }
                else
                {
                    continue;
                }
            }
            
            cardDifferenceCount += 1;
            deckDifferences.AppendLine($"{quantity} {card.Name}");
        }

        return cardDifferenceCount;
    }
    private static async Task<List<CardRecord>> GetCardList(IFormFile file)
    {
        var cardList = new List<CardRecord>();
        cardList = Path.GetExtension(file.FileName) switch
        {
            ".txt" => ParsePlainText(file),
            ".xml" or ".dek" => ParseXmlText(file),
            _ => cardList
        };

        return cardList;
    }
    private static List<CardRecord> ParseXmlText(IFormFile file)
    {
        var cards =  new List<CardRecord>();
        var xmlDoc = new XmlDocument();

        using (var reader = new StreamReader(file.OpenReadStream()))
        {
            xmlDoc.LoadXml(reader.ReadToEnd());
        }

        //Loop Through all 'Cards' Nodes
        foreach (XmlNode node in xmlDoc.GetElementsByTagName("Cards"))
        {
            var nodeDict = TextHelpers.SplitNodeOuterXml(node.OuterXml);
            
            var cardRecord = new CardRecord();
            
            foreach (var s in nodeDict.Keys)
            {
                nodeDict.TryGetValue(s, out var tmpValue);
                if (!string.IsNullOrWhiteSpace(tmpValue))
                {
                    cardRecord = TextHelpers.ParseValues(s, tmpValue, cardRecord);
                }
            }

            var prevCardRecord = cards.FirstOrDefault(x => x.Name == cardRecord.Name);
            if (prevCardRecord != null)
            {
                prevCardRecord.Qty += cardRecord.Qty;
            }
            else
            {
                cards.Add(cardRecord);
            }
        }
        //LogDecklist(cards);
        return LookupAndCleanupCards(cards);
    }
    private static List<CardRecord> ParsePlainText(IFormFile file)
    {
        var cards =  new List<CardRecord>();
        using (var reader = new StreamReader(file.OpenReadStream()))
        {
            while (reader.Peek() >= 0)
            {
                var line = reader.ReadLine()?.Split(' ', 2);
                if (line?.Length != 2) 
                    continue;

                if (!int.TryParse(line[0], out var qtyInt) || qtyInt <= 0) 
                    continue;
            
                var card = new CardRecord
                {
                    Qty = qtyInt,
                    Name = line[1]
                };
                cards.Add(card);
            }
        }
        //LogDecklist(cards);
        return LookupAndCleanupCards(cards);
    }
    private static string WriteToDecklist(List<CardRecord> cards)
    {
        var decklist = new StringBuilder();
        var cardCount = 0;
        var deckName = "";
        var commanderColors = new List<string>();
        var i = 0;

        foreach (var card in cards.Where(x => x.IsSideboard))
        {
            i++;
            if (i == 1)
                deckName = card.Name.Replace("’", "'");
            else deckName = deckName + " & " + card.Name.Replace("’", "'");
            
            commanderColors.AddRange(card.ColorIdentity!);
        }

        decklist.AppendLine($"[deck= {deckName} style={TextHelpers.GetDeckColorNickname(commanderColors)}]");

        decklist.AppendLine(WriteCardTypesToFile("General", cards.Where(x => x.IsSideboard).ToList()));
        decklist.AppendLine(WriteCardTypesToFile("Land", cards.Where(x => x.Type == "Land").ToList()));
        
        var types = cards.Where(x => x.Type != "Land" && !x.IsSideboard).GroupBy(y => y.Type).ToList();
        var highCountList = new List<IGrouping<string,CardRecord>>();
        
        foreach (var type in types.OrderByDescending(x => x.Count()))
        {
            if (type.Count() > 39)
            {
                highCountList.Add(type);
                continue;
            }
            if (cardCount + type.Count() <= 39)
            {
                decklist.AppendLine(WriteCardTypesToFile(type.Key, type.ToList()));
                cardCount += type.Count();
            }
            else
            {
                highCountList.Add(type);
            }

            if (cardCount > 34)
                cardCount = 0;
        }
        foreach (var highCount in highCountList.OrderByDescending(x => x.Count()))
        {
            decklist.AppendLine(WriteCardTypesToFile(highCount.Key, highCount.ToList()));
        }

        decklist.AppendLine($"Game Changers ({cards.Where(x=>x.IsGameChanger).Sum(x => x.Qty)})");
        foreach (var gc in cards.Where(x => x.IsGameChanger))
        {
            decklist.AppendLine($"{gc.Qty} {gc.Name}");
        }

        var missingCards = cards.Where(x => string.IsNullOrEmpty(x.Type)).ToList();
        if (missingCards.Count > 0)
        {
            decklist.AppendLine(
                $"Unable to Find Cards ({missingCards.Sum(x => x.Qty)})");
            foreach (var gc in missingCards)
            {
                decklist.AppendLine($"{gc.Qty} {gc.Name}");
            }
        }

        decklist.AppendLine("[/deck]");
        
        return decklist.ToString();
    }
    private static string WriteCardTypesToFile(string cardType, List<CardRecord> cardRecords)
    {
        var cardTypeStringBuilder = new StringBuilder();
        cardTypeStringBuilder.AppendLine($"{cardType} ({cardRecords.Sum(x => x.Qty)})");
        foreach (CardRecord card in cardRecords.OrderBy(x => x.Name))
        {
            var textLine = $"{card.Qty} {card.Name.Replace("’", "'")}";
            cardTypeStringBuilder.AppendLine(textLine);
        }
        
        return cardTypeStringBuilder.ToString();
    }
    private static List<CardRecord> LookupAndCleanupCards(List<CardRecord> cards)
    {
        foreach (var cardRecord in cards)
        {
            cardRecord.Name = TextHelpers.SplitCardName(cardRecord.Name);
        }
        return TursoCardDb.GetCardsFromDb(cards).Result;
    }
    private static string WriteToPicklist(List<CardRecord> cards)
    {
        var decklist = new StringBuilder();

        decklist.AppendLine(WriteCardTypesToFile("Land", cards.Where(x => x.Type == "Land").ToList()));
        var multicolor = cards.Where(x => x.Colors.Length > 1).ToList();
        var colorless = cards.Where(x => x.Type != "Land"  && x.Colors.Length == 0 && !string.IsNullOrEmpty(x.Type)).ToList();
        var colors = cards.Where(x => x.Type != "Land" && x.Colors.Length == 1).GroupBy(y => y.Colors).ToList();
        
        foreach (var color in colors)
        {
            var colorRecord = Colors.ColorList().FirstOrDefault(x => x.ColorAbbreviation == color.Key);
            decklist.AppendLine(WriteCardTypesToFile((colorRecord?.ColorName ?? "Color Unknown"), color.ToList()));
        }

        if (multicolor.Count != 0)
        {
            decklist.AppendLine(WriteCardTypesToFile("Multicolor", multicolor));
        }

        if (colorless.Count != 0)
        {
            
            decklist.AppendLine(WriteCardTypesToFile("Colorless", colorless));
        }
        
        decklist.AppendLine($"Game Changers ({cards.Where(x=>x.IsGameChanger).Sum(x => x.Qty)})");
        foreach (var gc in cards.Where(x => x.IsGameChanger))
        {
            decklist.AppendLine($"{gc.Qty} {gc.Name}");
        }

        var missingCards = cards.Where(x => string.IsNullOrEmpty(x.Type)).ToList();
        if (missingCards.Count > 0)
        {
            decklist.AppendLine();
            decklist.AppendLine(
                $"Unable to Find Cards ({missingCards.Sum(x => x.Qty)})");
            foreach (var gc in missingCards)
            {
                decklist.AppendLine($"{gc.Qty} {gc.Name}");
            }
        }

        return decklist.ToString();
    }
}