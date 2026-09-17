using System.Text;
using System.Text.RegularExpressions;

namespace MtgToolsApi.BusinessLayer;

public class MtgoLogParser
{
    public static string ParseMtgoGameLog(IFormFile file)
    {
        using var sr = new StreamReader(file.OpenReadStream(), Encoding.ASCII);
        var readFile = sr.ReadToEnd();
        var lines = readFile.Split("@P").ToList();
        
        lines = RemoveCardInfo(lines);

        CleanUpLines(ref lines, "?", true, true);
        CleanUpLines(ref lines, ".", true);
        CleanUpLines(ref lines, "%0E");
        CleanUpLines(ref lines, "@i"); 
        
        CleanUpLines(ref lines, string.Empty);
        CleanUpTurnHeaders(ref lines);
        var sb = new StringBuilder();
        foreach (var line in lines)
        {
            sb.AppendLine(line);
        }
        return sb.AppendJoin(Environment.NewLine, lines).ToString();
    }

    private static void CleanUpTurnHeaders(ref List<string> lines)
    {
        var players = lines.Where(x => x.Contains("joined the game")).ToList();
        foreach (var playerName in players.Select(player => player[..player.IndexOf(" joined the game", StringComparison.Ordinal)].Trim()))
        {
            for (var i = 0; i < lines.Count; i++)
            {
                if (!lines[i].StartsWith("Turn ")) continue;
                if (!lines[i].Contains(playerName)) continue;
                var incorrectPlayerName = lines[i][(lines[i].IndexOf(':') + 1)..];
                lines[i] = lines[i].Replace(incorrectPlayerName, playerName);
            }
        }
    }

    private static List<string> RemoveCardInfo(List<string> lines)
    {
        var newList = new List<string>();

        foreach (var line in lines)
        {
            var tmpLine = line;
            while (tmpLine.Contains("@["))
            {
                try
                {
                    var indexOfCharacter = tmpLine.IndexOf("@[", StringComparison.Ordinal);
                    //This gets the text up to the beginning of the first card tag 
                    var fullCardText = tmpLine[indexOfCharacter..];
                    //Remove the leading two characters
                    indexOfCharacter = fullCardText.IndexOf("@]", StringComparison.Ordinal);
                    //This concats the string found above with the rest of the string to remove the card tag info
                    if (indexOfCharacter > 0)
                    {
                        fullCardText = fullCardText[..(indexOfCharacter + 2)];
                        var simpleCardText = fullCardText[2..fullCardText.IndexOf("@:", StringComparison.Ordinal)];
                        tmpLine = tmpLine.Replace(fullCardText, simpleCardText);
                    }
                    else
                    {
                        _ = Logging.ApiLogger.LogMessage("Character could not be found");
                        tmpLine = tmpLine.Replace(fullCardText, "");
                    }
                }
                catch (Exception e)
                {
                    _ = Logging.ApiLogger.LogMessage(e.ToString());
                    throw;
                }
            }
            newList.Add(tmpLine);
        }
        return newList;
    }

    private static void CleanUpLines(ref List<string> lines, string v, bool substring = false, bool getFirstIndex = false)
    {
        for (var i = 0; i < lines.Count; i++)
        {
            if (string.IsNullOrWhiteSpace(lines[i])) continue;
            if (!substring)
            {
                if (string.IsNullOrEmpty(v))
                {
                    lines[i] = Regex.Replace(lines[i], "[^a-zA-Z0-9\\:_+()/,.' -]", "");
                }
                else
                {
                    lines[i] = lines[i].Replace(v, "");
                }
            }
            else if (lines[i].Contains(v))
            {
                if (getFirstIndex)
                {
                    lines[i] = lines[i].Substring(0, lines[i].IndexOf(v, StringComparison.Ordinal));
                }
                else
                {
                    var lastIndex = lines[i].LastIndexOf(v, StringComparison.Ordinal);
                    lines[i] = lines[i][..lastIndex];

                    var lastIndexOfClosingParenthesis = lastIndex = lines[i].LastIndexOf(')');
                    if ((lastIndex + 6) > lines[i].Length && lastIndex > lastIndexOfClosingParenthesis)
                    {
                        lines[i] = lines[i][..lastIndex];
                    }
                }
            }
        }
    }
}