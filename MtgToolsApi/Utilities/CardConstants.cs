namespace MtgToolsApi.Utilities;

[AttributeUsage(
    AttributeTargets.Class |
    AttributeTargets.Constructor |
    AttributeTargets.Field |
    AttributeTargets.Method |
    AttributeTargets.Property,
    AllowMultiple = true)]
public class CardTypeValue(string type, string output) : Attribute
{
    public readonly string TypeValue = type, OutputValue = output;
}

public class CardTypes
{
    //Define these as attributes so a loop in the main class can use the type and the output value
    [CardTypeValue("Creature", "Creatures")]
    [CardTypeValue("Artifact", "Artifacts")]
    [CardTypeValue("Enchantment", "Enchantments")]
    [CardTypeValue("Planeswalker", "Planeswalkers")]
    [CardTypeValue("Instant", "Instants")]
    [CardTypeValue("Sorcery", "Sorceries")]
    [CardTypeValue("Battle", "Battles")]
    [CardTypeValue("Land", "Lands")]
    public const string AllCardTypes = "All Card Types";
}

public class ColorsCombinations
{
    //Mono Color
    [CardTypeValue("W", "White")]
    [CardTypeValue("U", "Blue")]
    [CardTypeValue("B", "Black")]
    [CardTypeValue("R", "Red")]
    [CardTypeValue("G", "Green")]
    //Two Color
    [CardTypeValue("BG", "Golgari")]
    [CardTypeValue("BR", "Rakdos")]
    [CardTypeValue("BU", "Dimir")]
    [CardTypeValue("BW", "Orzhov")]
    [CardTypeValue("GR", "Gruul")]
    [CardTypeValue("GU", "Simic")]
    [CardTypeValue("GW", "Selesnya")]
    [CardTypeValue("RU", "Izzet")]
    [CardTypeValue("RW", "Boros")]
    [CardTypeValue("UW", "Azorius")]
    //Three Color
    [CardTypeValue("BGR", "Jund")]
    [CardTypeValue("BGU", "Sultai")]
    [CardTypeValue("BGW", "Abzan")]
    [CardTypeValue("BRU", "Grixis")]
    [CardTypeValue("BRW", "Mardu")]
    [CardTypeValue("BUW", "Esper")]
    [CardTypeValue("GRU", "Temur")]
    [CardTypeValue("GRW", "Naya")]
    [CardTypeValue("GUW", "Bant")]
    [CardTypeValue("RUW", "Jeskai")]
    //Four Color
    [CardTypeValue("BGRU", "UBRG")]
    [CardTypeValue("BGRW", "WBRG")]
    [CardTypeValue("BGUW", "WUBG")]
    [CardTypeValue("BRUW", "WUBR")]
    [CardTypeValue("GRUW", "WURG")]
    //Five Color
    [CardTypeValue("BRGUW", "WUBRG")]
    public const string AllColorCombos = "All Color Combos";
}