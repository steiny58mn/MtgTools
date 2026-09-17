using System.Text;
using MtgToolsApi.DataRepository;
using MtgToolsApi.Utilities;

namespace MtgToolsApi.BusinessLayer;

public static class ThreadBbCode
{
    public static string GetBbCode(string color, int bbCodeType)
    {
        var bbCodeString = $"BbCodeType {bbCodeType} not recognized";
        var colorItem = Colors.ColorList().FirstOrDefault(x => x.ColorName == color);
        if (colorItem == null) return $"Color {color} not recognized";
        
        switch (bbCodeType)
        {
            case (int)Enums.BbCodeType.DeckUpdate:
                bbCodeString = GenerateBbCodeForDeckUpdates(color);
                break;
            case (int)Enums.BbCodeType.SetReviews:
                bbCodeString = GenerateBbCodeForSetReviews(color, colorItem);
                break;
            case (int)Enums.BbCodeType.GameSummary:
                bbCodeString = GenerateBbCodeForGameSummary(color);
                break;
        }

        return bbCodeString;
    }

    private static string GenerateBbCodeForGameSummary(string colors)
    {
        var sb = new StringBuilder();
        if (colors == string.Empty) return sb.ToString();
        sb.AppendLine($"[CENTER][HEADER style={colors}][SIZE=100]Start of Summary[/SIZE][/HEADER][/CENTER]");
        sb.AppendLine();
        sb.AppendLine($"[CENTER][HEADER style={colors}][SIZE=100]End of Summary[/SIZE][/HEADER][/CENTER]");

        return sb.ToString();
    }

    private static string GenerateBbCodeForDeckUpdates(string colors)
    {
        StringBuilder sb = new StringBuilder();
        if (colors != string.Empty)
        {
            DateTime curDate = DateTime.Today;
            sb.AppendLine($"[deck={curDate.Month}/{curDate.Day}/{curDate.Year} style={colors} menu=hide order=auto]");
            sb.AppendLine("CUTS");
            sb.AppendLine();
            sb.AppendLine("ADDS");
            sb.AppendLine();
            sb.AppendLine("[/deck]");
        }

        return sb.ToString();
    }

    private static string GenerateBbCodeForSetReviews(string colors, Color colorItem)
    {
        StringBuilder sb = new StringBuilder();
        if (colors != string.Empty)
        {
            foreach (var nextColorItem in colorItem.ColorAbbreviation.Select(t => 
                         Colors.ColorList().FirstOrDefault(x => x.ColorAbbreviation == t.ToString()))
                         .OfType<Color>())
            {
                sb.AppendLine(HeaderBbCode(nextColorItem.ColorName, nextColorItem.ColorName));
                sb.AppendLine();
            }

            if (colorItem.ColorAbbreviation.Length > 1)
            {
                sb.AppendLine(HeaderBbCode(colors, "Multicolor"));
                sb.AppendLine();
            }
        }

        sb.AppendLine(HeaderBbCode("Colorless", "Colorless and Land"));
        return sb.ToString();
    }

    private static string HeaderBbCode(string style, string text)
    {
        return $"[CENTER][HEADER style={style}][SIZE=100]{text} Cards[/SIZE][/HEADER][/CENTER]";
    }
}