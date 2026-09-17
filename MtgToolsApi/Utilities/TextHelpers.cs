using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using MtgToolsApi.DataRepository;

namespace MtgToolsApi.Utilities;

public static class TextHelpers
{
    public static string FormatText(Text formatter)
    {
        var modifiedText = AddCardTags(formatter.PastedText);

        return formatter.ExistingText.Insert(formatter.CursorPosition, modifiedText);
    }

    private static string AddCardTags(string newText)
    {
        _ = Logging.ApiLogger.LogMessage($"Processing text");
        _ = Logging.ApiLogger.LogMessage($"{newText}");
        var cardLines = newText.Split('\n');
        var formattedText = new StringBuilder();
        foreach (var line in cardLines)
        {
            int indexOfDash;
            var tmpLine = line;
            _ = Logging.ApiLogger.LogMessage($"Processing the next line");
            _ = Logging.ApiLogger.LogMessage($"{tmpLine}");
            //Make sure we have a dash and that it is at least the second character
            if (tmpLine.Length > 40 && (indexOfDash = tmpLine.IndexOf(" - ", 1, 40, StringComparison.Ordinal)) > 0)
            {
                //Add brackets before dash.
                tmpLine = tmpLine.Insert(indexOfDash, "]]");
                //Add brackets at the beginning and return the text
                tmpLine = tmpLine.Insert(0, "[[");
            }
            formattedText.AppendLine(tmpLine);
        }
        
        return formattedText.ToString();
    }

    public static CardRecord ParseValues(string s, string tmpValue, CardRecord cardRecord)
    {
        switch (s)
        {
            case "Name":
                cardRecord.Name = tmpValue;
                break;
            case "Quantity":
                int.TryParse(tmpValue, out cardRecord.Qty);
                break;
            case "Sideboard":
                bool.TryParse(tmpValue, out cardRecord.IsSideboard);
                break;
        }
        return cardRecord;
    }

    internal static string GetDeckColorNickname(List<string> commanderColors)
    {
        StringBuilder sb = new StringBuilder();
        foreach (string s in commanderColors.Distinct().OrderBy(x => x))
        {
            sb.Append(s);
        }

        return ConvertColorsToNickname(sb.ToString());
    }

    private static string ConvertColorsToNickname(string colors)
    {
        var attributeList = typeof(ColorsCombinations).GetFields(BindingFlags.Static | BindingFlags.Public)
            .Select(x => x.GetCustomAttributes(false)).ToList();
        
        var ctvList = attributeList[0]
            .Where(attr => attr.GetType() != typeof(NullableAttribute))
            .Cast<CardTypeValue>();
        
        var type = ctvList.FirstOrDefault(x => x.TypeValue == colors);
        return type != null ? type.OutputValue : string.Empty;
    }

    public static string CleanCardType(string cardType)
    {
        //This sets every card to have a singular card type
        return cardType switch
        {
            not null when cardType.Contains("Land") => "Land",
            not null when cardType.Contains("Creature") => "Creature",
            not null when cardType.Contains("Artifact") => "Artifact",
            not null when cardType.Contains("Enchantment") => "Enchantment",
            not null when cardType.Contains("Planeswalker") => "Planeswalker",
            not null when cardType.Contains("Instant") => "Instant",
            not null when cardType.Contains("Sorcery") => "Sorcery",
            not null when cardType.Contains("Battle") => "Battle",
            _ => "No Card Type Found"
        };
    }

    public static Dictionary<string, string> SplitNodeOuterXml(string outerXml)
    {
        var dict = new Dictionary<string, string>();
        int qtyIndex = outerXml.IndexOf("Quantity", StringComparison.Ordinal),
            sideboardIndex = outerXml.IndexOf("Sideboard", StringComparison.Ordinal),
            nameIndex = outerXml.IndexOf("Name", StringComparison.Ordinal),
            annotationIndex = outerXml.IndexOf("Annotation", StringComparison.Ordinal);

        //Quantity is between 'Quantity' and 'Sideboard' elements
        var quantity = outerXml.Substring(qtyIndex + 9, sideboardIndex - (qtyIndex + 9)).Replace("\"", "").Trim();
        //Sideboard is between 'Sideboard' and 'Name' elements
        var sideboard = outerXml.Substring(sideboardIndex + 10, nameIndex - (sideboardIndex + 10)).Replace("\"", "")
            .Trim();
        //Name is between 'Name' and 'Annotation' elements
        var name = outerXml.Substring(nameIndex + 5, annotationIndex - (nameIndex + 5)).Replace("\"", "").Trim();

        dict.Add("Quantity", quantity);
        dict.Add("Sideboard", sideboard);
        dict.Add("Name", name);
        return dict;
    }

    public static List<CardTypeValue> GetCtvList()
    {
        var attributeList = typeof(CardTypes).GetFields(BindingFlags.Static | BindingFlags.Public)
            .Select(x => x.GetCustomAttributes(false)).ToList();

        return attributeList[0]
            .Where(attr => attr.GetType() != typeof(NullableAttribute))
            .Cast<CardTypeValue>()
            .ToList();
    }

    public static string SplitCardName(string cardRecordName)
    {
        if (cardRecordName.Contains('|')) cardRecordName = cardRecordName.Substring(0, cardRecordName.IndexOf('|'));
        return cardRecordName;
    }
}