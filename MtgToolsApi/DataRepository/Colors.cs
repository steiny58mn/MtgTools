namespace MtgToolsApi.DataRepository;

public static class Colors
{
    public static List<Color> ColorList()
    {
        var colorList = new List<Color>
        {
            new Color { ColorName="White", ColorAbbreviation = "W" },
            new Color { ColorName="Blue", ColorAbbreviation = "U" },
            new Color { ColorName="Black", ColorAbbreviation = "B" },
            new Color { ColorName="Red", ColorAbbreviation = "R" },
            new Color { ColorName="Green", ColorAbbreviation = "G" },
            new Color { ColorName="Azorius", ColorAbbreviation = "WU" },
            new Color { ColorName="Orzhov", ColorAbbreviation = "WB" },
            new Color { ColorName="Boros", ColorAbbreviation = "WR" },
            new Color { ColorName="Selesnya", ColorAbbreviation = "WG" },
            new Color { ColorName="Dimir", ColorAbbreviation = "UB" },
            new Color { ColorName="Rakdos", ColorAbbreviation = "BR" },
            new Color { ColorName="Golgari", ColorAbbreviation = "BG" },
            new Color { ColorName="Izzet", ColorAbbreviation = "UR" },
            new Color { ColorName="Simic", ColorAbbreviation = "UG" },
            new Color { ColorName="Gruul", ColorAbbreviation = "RG" },
            new Color { ColorName="Esper", ColorAbbreviation = "WUB" },
            new Color { ColorName="Mardu", ColorAbbreviation = "WBR" },
            new Color { ColorName="Abzan", ColorAbbreviation = "WBG" },
            new Color { ColorName="Jeskai", ColorAbbreviation = "WUR" },
            new Color { ColorName="Bant", ColorAbbreviation = "WUG" },
            new Color { ColorName="Naya", ColorAbbreviation = "WRG" },
            new Color { ColorName="Grixis", ColorAbbreviation = "UBR" },
            new Color { ColorName="Sultai", ColorAbbreviation = "UBG" },
            new Color { ColorName="Jund", ColorAbbreviation = "BRG" },
            new Color { ColorName="Temur", ColorAbbreviation = "URG" },
            new Color { ColorName="WUBR", ColorAbbreviation = "WUBR" },
            new Color { ColorName="WUBG", ColorAbbreviation = "WUBG" },
            new Color { ColorName="WBRG", ColorAbbreviation = "WBRG" },
            new Color { ColorName="WURG", ColorAbbreviation = "WURG" },
            new Color { ColorName="UBRG", ColorAbbreviation = "UBRG" },
            new Color { ColorName="WUBRG", ColorAbbreviation = "WUBRG" },
            new Color { ColorName="Colorless", ColorAbbreviation = string.Empty }
        };

        return colorList;
    }
}

public class Color
{
    public required string ColorName { get; init; }
    public required string ColorAbbreviation { get; init; }
}